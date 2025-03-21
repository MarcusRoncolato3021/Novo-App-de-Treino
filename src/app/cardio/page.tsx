'use client';

import React, { useState } from 'react';
import { db, Cardio } from '@/lib/db';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';

export default function CardioPage() {
  const [exercicio, setExercicio] = useState('');
  const [duracao, setDuracao] = useState('');
  const [nivelBike, setNivelBike] = useState('');
  const [intensidade, setIntensidade] = useState<'baixa' | 'media' | 'alta'>('media');

  const tiposExercicios = [
    'Corrida',
    'Caminhada',
    'Ciclismo',
    'Natação',
    'Pular corda',
    'Elíptico',
    'Escada',
    'Bike',
    'Outro'
  ];

  const historicoCardio = useLiveQuery(
    () => db.cardio
      .orderBy('data')
      .reverse()
      .limit(5)
      .toArray()
  );

  const salvarExercicio = async () => {
    if (!exercicio || !duracao) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    if (exercicio === 'Bike' && !nivelBike) {
      alert('Por favor, insira o nível da bike');
      return;
    }

    try {
      const novoExercicio: Cardio = {
        nome: exercicio,
        duracao: parseInt(duracao),
        intensidade: exercicio === 'Bike' ? 'alta' : intensidade,
        data: new Date(),
        observacoes: exercicio === 'Bike' ? `Nível ${nivelBike}` : undefined,
        treinoId: 0 // Como é um exercício avulso, usamos 0 como ID do treino
      };

      await db.cardio.add(novoExercicio);

      alert('Exercício salvo com sucesso!');
      setExercicio('');
      setDuracao('');
      setNivelBike('');
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      alert('Erro ao salvar exercício. Tente novamente.');
    }
  };

  const formatarData = (data: Date) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Exercício Cardio</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Exercício
              </label>
              <select
                value={exercicio}
                onChange={(e) => setExercicio(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione um exercício</option>
                {tiposExercicios.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duração (minutos)
              </label>
              <input
                type="number"
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 30"
              />
            </div>

            {exercicio === 'Bike' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível da Bike
                </label>
                <input
                  type="number"
                  value={nivelBike}
                  onChange={(e) => setNivelBike(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 5"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intensidade
              </label>
              <select
                value={intensidade}
                onChange={(e) => setIntensidade(e.target.value as 'baixa' | 'media' | 'alta')}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>

            <button
              onClick={salvarExercicio}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-300"
            >
              Salvar Exercício
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Histórico Recente</h2>
          <div className="space-y-4">
            {historicoCardio?.map((exercicio) => (
              <div key={exercicio.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">{exercicio.nome}</h3>
                    <p className="text-sm text-gray-600">{exercicio.duracao} minutos</p>
                    <p className="text-sm text-gray-600">Intensidade: {exercicio.intensidade}</p>
                    {exercicio.observacoes && (
                      <p className="text-sm text-gray-600">{exercicio.observacoes}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatarData(exercicio.data)}</span>
                </div>
              </div>
            ))}
            {(!historicoCardio || historicoCardio.length === 0) && (
              <p className="text-gray-500 text-center">Nenhum exercício registrado ainda</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 