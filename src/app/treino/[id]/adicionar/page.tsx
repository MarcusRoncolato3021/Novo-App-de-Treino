'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db, TipoExecucao, TipoSerie } from '@/lib/db';
import { toast } from 'react-hot-toast';

export default function AdicionarExercicioPage() {
  const params = useParams();
  const router = useRouter();
  const treinoId = Number(params.id);
  
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoExecucao>('SIMP');
  const [metaMin, setMetaMin] = useState('8');
  const [metaMax, setMetaMax] = useState('12');
  const [numeroSeries, setNumeroSeries] = useState('3');

  const handleSubmit = async () => {
    if (!nome.trim()) {
      toast.error('Digite o nome do exercício');
      return;
    }

    try {
      // Buscar último exercício do treino para definir a ordem
      const ultimoExercicio = await db.exercicios
        .where('treinoId')
        .equals(treinoId)
        .reverse()
        .first();
      
      const ordem = ultimoExercicio ? ultimoExercicio.ordem + 1 : 1;

      // Converter para número e garantir que seja positivo
      const numWorkSets = Math.max(1, Number(numeroSeries) || 0);

      // Adicionar exercício
      const exercicioId = await db.exercicios.add({
        nome: nome.trim(),
        treinoId,
        tipoExecucao: tipo,
        ordem,
        numeroWorkSets: numWorkSets,
        metaMin: Number(metaMin),
        metaMax: Number(metaMax)
      });

      // Array para armazenar todas as séries
      const todasSeries = [];

      if (tipo === 'COMP') {
        // Warm-up (sempre número 1)
        const warmUp = {
          exercicioId,
          numero: 1,
          tipo: 'warm-up' as TipoSerie,
          peso: 0
        };
        todasSeries.push(warmUp);

        // Feeders (números 2 e 3)
        const feeder1 = {
          exercicioId,
          numero: 2,
          tipo: 'feeder' as TipoSerie,
          peso: 0
        };
        const feeder2 = {
          exercicioId,
          numero: 3,
          tipo: 'feeder' as TipoSerie,
          peso: 0
        };
        todasSeries.push(feeder1, feeder2);

        // Work sets (começando do número 4)
        for (let i = 0; i < numWorkSets; i++) {
          const workSet = {
            exercicioId,
            numero: i + 4,
            tipo: 'work-set' as TipoSerie,
            peso: 0
          };
          todasSeries.push(workSet);
        }
      } else {
        // Para exercícios SIMP, apenas work sets
        for (let i = 0; i < numWorkSets; i++) {
          const workSet = {
            exercicioId,
            numero: i + 1,
            tipo: 'work-set' as TipoSerie,
            peso: 0
          };
          todasSeries.push(workSet);
        }
      }

      // Adicionar todas as séries de uma vez
      await db.series.bulkAdd(todasSeries);
      
      router.push(`/treino/${treinoId}`);
      toast.success('Exercício adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
      toast.error('Erro ao adicionar exercício');
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-md">
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <Link 
            href={`/treino/${treinoId}`}
            className="text-blue-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Adicionar Exercício</h1>
          <div className="w-5 h-5"></div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nome do Exercício</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Supino Reto"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 text-base"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo de Execução</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipo('SIMP')}
                className={`flex-1 py-2 px-4 rounded-lg text-base font-medium transition-colors ${
                  tipo === 'SIMP'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Simples
              </button>
              <button
                onClick={() => setTipo('COMP')}
                className={`flex-1 py-2 px-4 rounded-lg text-base font-medium transition-colors ${
                  tipo === 'COMP'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Complexa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reps. Mínimas</label>
              <input
                type="number"
                value={metaMin}
                onChange={(e) => setMetaMin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 text-base text-center"
                min="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reps. Máximas</label>
              <input
                type="number"
                value={metaMax}
                onChange={(e) => setMetaMax(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 text-base text-center"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {tipo === 'COMP' ? 'Número de Work Sets' : 'Número de Séries'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={numeroSeries}
                onChange={(e) => setNumeroSeries(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 text-base text-center"
                min="1"
              />
            </div>
          </div>

          {tipo === 'COMP' && (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              Warm Up e 2 Feeders serão adicionados automaticamente
            </div>
          )}
        </div>

        <div className="p-4 pt-0">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Adicionar Exercício
          </button>
        </div>
      </div>
    </div>
  );
} 