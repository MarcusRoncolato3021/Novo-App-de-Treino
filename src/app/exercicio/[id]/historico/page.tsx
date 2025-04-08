'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, TipoSerie } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function HistoricoPage() {
  const params = useParams();
  const router = useRouter();
  const exercicioId = Number(params.id);
  const [isLimpando, setIsLimpando] = useState(false);

  const exercicio = useLiveQuery(
    () => db.exercicios.get(exercicioId),
    [exercicioId]
  );

  const registros = useLiveQuery(
    () => db.historico
      .where('exercicioId')
      .equals(exercicioId)
      .filter(registro => registro.tipo === 'work-set')
      .reverse()
      .sortBy('data'),
    [exercicioId]
  );

  const handleLimparHistorico = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o histórico deste exercício? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setIsLimpando(true);
      await db.historico
        .where('exercicioId')
        .equals(exercicioId)
        .delete();
      
      toast.success('Histórico limpo com sucesso!');
      setIsLimpando(false);
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      toast.error('Erro ao limpar histórico');
      setIsLimpando(false);
    }
  };

  const registrosPorData = React.useMemo(() => {
    if (!registros) return {};

    const grupos: { [key: string]: typeof registros } = {};
    registros.forEach(registro => {
      const data = new Date(registro.data).toLocaleDateString('pt-BR');
      if (!grupos[data]) {
        grupos[data] = [];
      }
      grupos[data].push(registro);
    });

    return grupos;
  }, [registros]);

  const getTituloSerie = (tipo: string, ordem: number) => {
    if (tipo === 'warm-up') return 'Warm Up';
    if (tipo === 'feeder') {
      return `Feeder ${ordem + 1}`;
    }
    return `Work Set ${ordem}`;
  };

  if (!exercicio || !registros) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl p-6">
          <div className="flex items-center justify-center">
            <span className="text-gray-600">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/exercicio/${exercicioId}`}
              className="text-blue-600 hover:text-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <div className="flex-1 flex items-center justify-center mx-4">
              <h1 className="text-xl font-bold text-center text-blue-600">Histórico</h1>
            </div>
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            <div className="space-y-6">
              {Object.entries(registrosPorData).map(([data, registrosDia]) => (
                <div key={data} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {data}
                    </h2>
                    <button
                      onClick={() => handleLimparHistorico()}
                      className="text-blue-600 hover:text-red-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {registrosDia
                      .filter(registro => registro.tipo === 'work-set')
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((registro) => (
                        <div key={registro.id} className="bg-gray-50 rounded p-1.5">
                          <div className="flex justify-center">
                            <h3 className="text-base font-semibold text-gray-800">
                              {getTituloSerie(exercicio?.tipoExecucao || 'SIMP', registro.ordem)}
                            </h3>
                          </div>

                          <div className="bg-white rounded p-1.5">
                            <div className="flex flex-col items-center space-y-1">
                              <div className="w-full flex flex-col items-center">
                                <span className="text-xs text-gray-600">Carga</span>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-sm font-medium text-blue-600">{registro.peso}</span>
                                  <span className="text-xs text-gray-400">kg</span>
                                </div>
                              </div>
                              <div className="w-full flex flex-col items-center">
                                <span className="text-xs text-gray-600">Reps</span>
                                <span className="text-sm font-medium text-blue-600">{registro.repeticoes}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 