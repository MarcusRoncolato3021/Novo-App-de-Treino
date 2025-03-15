'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import type { Serie } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface Progresso {
  serie: number;
  diferencaPeso: number;
  diferencaReps: number;
}

export default function ExercicioPage() {
  const params = useParams();
  const router = useRouter();
  const exercicioId = Number(params.id);
  const [repeticoesFeitas, setRepeticoesFeitas] = useState<{[key: string]: string}>({});
  const [observacoes, setObservacoes] = useState('');

  const exercicio = useLiveQuery(
    () => db.exercicios.get(exercicioId),
    [exercicioId]
  );

  const series = useLiveQuery(
    () => db.series
      .where('exercicioId')
      .equals(exercicioId)
      .sortBy('ordem'),
    [exercicioId]
  );

  const historico = useLiveQuery(
    () => db.historico
      .where('exercicioId')
      .equals(exercicioId)
      .reverse()
      .sortBy('data'),
    [exercicioId]
  );

  const atualizarSerie = async (serieId: number, novosDados: Partial<Serie>) => {
    await db.series.update(serieId, novosDados);
  };

  const registrarExecucao = async () => {
    if (!exercicio || !series) return;

    // Verificar se todas as séries têm repetições registradas
    if (exercicio.tipoExecucao === 'SIMP') {
      const seriesSimples = series.filter(s => s.tipo === 'SIMPLES');
      const faltamRepeticoes = seriesSimples.some(serie => 
        !repeticoesFeitas[`serie-${serie.id}`] || repeticoesFeitas[`serie-${serie.id}`].trim() === ''
      );

      if (faltamRepeticoes) {
        alert('Por favor, registre as repetições realizadas em todas as séries antes de salvar.');
        return;
      }
    }

    const data = new Date();
    
    for (const serie of series) {
      if (serie.tipo !== 'SIMPLES') continue;

      const repeticoes = Number(repeticoesFeitas[`serie-${serie.id}`] || 0);
      
      await db.historico.add({
        exercicioId,
        data,
        peso: serie.pesoAtual,
        repeticoes,
        tipo: 'SIMPLES',
        observacoes: `Meta: ${serie.repeticoesMinimas}-${serie.repeticoesMaximas} reps | Realizadas: ${repeticoes} reps${observacoes ? ' | Obs: ' + observacoes : ''}`
      });
    }

    // Limpar o formulário
    setRepeticoesFeitas({});
    setObservacoes('');
    
    alert('Execução registrada com sucesso!');
    router.refresh();
  };

  const calcularProgresso = () => {
    if (!historico?.length) return null;

    const registrosPorData = historico.reduce((acc, registro) => {
      const data = dayjs(registro.data).format('DD/MM/YYYY');
      if (!acc[data]) {
        acc[data] = [];
      }
      acc[data].push(registro);
      return acc;
    }, {} as Record<string, typeof historico>);

    const datas = Object.keys(registrosPorData);
    if (datas.length < 2) return null;

    const ultimaData = datas[0];
    const penultimaData = datas[1];

    const ultimasSeries = registrosPorData[ultimaData];
    const penultimasSeries = registrosPorData[penultimaData];

    const progresso = ultimasSeries.map((serie, index) => {
      const serieAnterior = penultimasSeries[index];
      if (!serieAnterior) return null;

      const diferencaPeso = serie.peso - serieAnterior.peso;
      const diferencaReps = serie.repeticoes - serieAnterior.repeticoes;

      return {
        serie: index + 1,
        diferencaPeso,
        diferencaReps
      };
    }).filter((p): p is Progresso => p !== null);

    return progresso;
  };

  if (!exercicio) {
    return <div>Carregando...</div>;
  }

  const progresso = calcularProgresso();

  return (
    <main className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{exercicio.nome}</h1>
          <p className="text-gray-600">
            Execução {exercicio.tipoExecucao === 'COMP' ? 'Complexa' : 'Simplificada'}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:text-blue-700"
        >
          Voltar
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-4">Séries Atuais</h2>
          <div className="space-y-4">
            {series?.map((serie) => (
              <div
                key={serie.id}
                className="p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">
                    {serie.tipo === 'WARM_UP' && 'Aquecimento (fazer ~15 reps)'}
                    {serie.tipo === 'FEEDER' && `Feeder ${serie.ordem - 1} (fazer 5 reps)`}
                    {serie.tipo === 'WORK_SET' && `Série Principal ${serie.ordem - 3}`}
                    {serie.tipo === 'SIMPLES' && `Série ${serie.ordem}`}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Descanso: {serie.tempoDescanso / 60} min
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        value={serie.pesoAtual}
                        onChange={(e) => serie.id && atualizarSerie(serie.id, {
                          pesoAtual: Number(e.target.value)
                        })}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                        min="0"
                        step="0.5"
                      />
                    </div>

                    {serie.tipo === 'SIMPLES' && exercicio.tipoExecucao === 'SIMP' && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Meta: {serie.repeticoesMinimas}-{serie.repeticoesMaximas} reps
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={repeticoesFeitas[`serie-${serie.id}`] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRepeticoesFeitas(prev => ({
                              ...prev,
                              [`serie-${serie.id}`]: value
                            }));
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-center"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {exercicio.tipoExecucao === 'SIMP' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="Registre aqui suas observações sobre o treino..."
              />
            </div>
          )}

          <button
            onClick={registrarExecucao}
            className="w-full mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Registrar Execução
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Histórico e Progresso</h2>
          
          {progresso && progresso.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">Progresso desde o último treino:</h3>
              <div className="space-y-2">
                {progresso.map((p) => (
                  <div key={p.serie} className="flex items-center justify-between">
                    <span>Série {p.serie}:</span>
                    <div className="space-x-4">
                      <span className={p.diferencaPeso > 0 ? 'text-green-600' : p.diferencaPeso < 0 ? 'text-red-600' : ''}>
                        {p.diferencaPeso > 0 ? '+' : ''}{p.diferencaPeso}kg
                      </span>
                      <span className={p.diferencaReps > 0 ? 'text-green-600' : p.diferencaReps < 0 ? 'text-red-600' : ''}>
                        {p.diferencaReps > 0 ? '+' : ''}{p.diferencaReps} reps
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(
              historico?.reduce((acc, registro) => {
                const data = dayjs(registro.data).format('DD/MM/YYYY');
                if (!acc[data]) {
                  acc[data] = [];
                }
                acc[data].push(registro);
                return acc;
              }, {} as Record<string, typeof historico>) || {}
            ).map(([data, registros]) => (
              <div key={data} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="font-medium">{data}</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {registros.map((registro, index) => (
                    <div key={registro.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {registro.tipo === 'WORK_SET' ? 'Série Principal' : 'Série'} {index + 1}
                        </span>
                        <span>{registro.peso}kg × {registro.repeticoes} reps</span>
                      </div>
                      {registro.observacoes && (
                        <p className="text-sm text-gray-500 mt-1">{registro.observacoes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(!historico || historico.length === 0) && (
              <p className="text-gray-500 text-center py-4">
                Nenhum registro encontrado
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 