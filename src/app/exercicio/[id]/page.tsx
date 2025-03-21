'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, Exercicio, Serie, TipoExecucao, TipoSerie, HistoricoExercicio } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';

export default function ExercicioPage() {
  const params = useParams();
  const router = useRouter();
  const exercicioId = Number(params.id);
  const [repeticoesFeitas, setRepeticoesFeitas] = useState<{[key: string]: string}>({});
  const [observacoes, setObservacoes] = useState<{[key: number]: string}>({});

  const exercicio = useLiveQuery(
    () => db.exercicios.get(exercicioId),
    [exercicioId]
  );

  const series = useLiveQuery(
    () => db.series
      .where('exercicioId')
      .equals(exercicioId)
      .toArray(),
    [exercicioId]
  );

  const historico = useLiveQuery(
    () => db.historico
      .where('exercicioId')
      .equals(exercicioId)
      .reverse()
      .limit(5)
      .toArray(),
    [exercicioId]
  );

  const atualizarSerie = async (serieId: number, novosDados: Partial<Serie>) => {
    try {
      await db.series.update(serieId, novosDados);
    } catch (error) {
      console.error('Erro ao atualizar série:', error);
      alert('Erro ao atualizar série. Tente novamente.');
    }
  };

  const registrarHistorico = async (historicoExercicios: HistoricoExercicio[]) => {
    try {
      await db.historico.bulkAdd(historicoExercicios);
      setRepeticoesFeitas({});
      setObservacoes({});
      alert('Execução registrada com sucesso!');
      router.refresh();
    } catch (error) {
      console.error('Erro ao registrar histórico:', error);
      alert('Erro ao registrar histórico. Tente novamente.');
    }
  };

  const renderSerie = (serie: Serie) => {
    const tipoLabel = {
      'warm-up': 'Aquecimento',
      'feeder': 'Preparatória',
      'work-set': 'Principal'
    }[serie.tipo];

    return (
      <div key={serie.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{tipoLabel}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {serie.tipo === 'warm-up' ? '15-20 reps' :
               serie.tipo === 'feeder' ? '5 reps' :
               exercicio && `${exercicio.repeticoesMinimas}-${exercicio.repeticoesMaximas} reps`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Peso (kg)
            </label>
            <input
              type="number"
              value={serie.peso}
              onChange={(e) => serie.id && atualizarSerie(serie.id, { peso: Number(e.target.value) })}
              className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.5"
            />
          </div>

          {serie.tipo === 'work-set' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Repetições
              </label>
              <input
                type="number"
                value={repeticoesFeitas[`serie-${serie.id}`] || ''}
                onChange={(e) => setRepeticoesFeitas(prev => ({
                  ...prev,
                  [`serie-${serie.id}`]: e.target.value
                }))}
                className="w-full px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                placeholder="0"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!exercicio || !series) {
    return <div>Carregando...</div>;
  }

  // Verificar se todas as séries têm repetições registradas
  if (exercicio.tipoExecucao === 'SIMP') {
    const seriesSimples = series.filter(s => s.tipo === 'work-set');
    const faltamRepeticoes = seriesSimples.some(serie =>
      !repeticoesFeitas[`serie-${serie.id}`] || repeticoesFeitas[`serie-${serie.id}`].trim() === ''
    );

    if (faltamRepeticoes) {
      alert('Por favor, preencha as repetições de todas as séries antes de registrar.');
      return;
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/treino/${exercicio.treinoId}`} className="text-blue-600 hover:text-blue-800">
            ← Voltar ao Treino
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{exercicio.nome}</h1>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Séries</h2>
            <div className="space-y-4">
              {series.map(renderSerie)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Observações
            </label>
            <textarea
              value={observacoes[exercicioId] || ''}
              onChange={(e) => setObservacoes(prev => ({
                ...prev,
                [exercicioId]: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Registre aqui suas observações sobre o treino..."
            />
          </div>

          <button
            onClick={() => registrarHistorico(series.map(serie => ({
              exercicioId: serie.exercicioId,
              data: new Date(),
              peso: serie.peso,
              repeticoes: Number(repeticoesFeitas[`serie-${serie.id}`] || 0),
              observacoes: observacoes[exercicioId] || ''
            })))}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Registrar Execução
          </button>
        </div>

        {historico && historico.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Histórico Recente</h2>
            <div className="space-y-4">
              {historico.map((registro) => (
                <div key={registro.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">
                        {new Date(registro.data).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="font-medium">
                        {registro.repeticoes} reps × {registro.peso}kg
                      </p>
                    </div>
                    {registro.observacoes && (
                      <p className="text-sm text-gray-600">{registro.observacoes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 