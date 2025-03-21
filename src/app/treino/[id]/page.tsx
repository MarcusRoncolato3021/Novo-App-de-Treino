'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, Exercicio, Serie, TipoExecucao, TipoSerie } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import type { HistoricoExercicio } from '@/lib/db';

const diasDaSemana = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function TreinoPage() {
  const params = useParams();
  const router = useRouter();
  const treinoId = Number(params.id);
  const [novoExercicioNome, setNovoExercicioNome] = useState('');
  const [tipoExecucao, setTipoExecucao] = useState<'SIMP' | 'COMP'>('SIMP');
  const [repeticoesMinimas, setRepeticoesMinimas] = useState(8);
  const [repeticoesMaximas, setRepeticoesMaximas] = useState(12);
  const [numeroWorkSets, setNumeroWorkSets] = useState(3);
  const [numeroSeriesSimp, setNumeroSeriesSimp] = useState(3);
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
  const [repeticoesFeitas, setRepeticoesFeitas] = useState<{[key: string]: {[key: string]: string}}>({});
  const [observacoes, setObservacoes] = useState<{[key: string]: string}>({});
  const [historicoSemanaAnterior, setHistoricoSemanaAnterior] = useState<{[key: number]: {[key: number]: number}}>({});
  const [exerciciosExpandidos, setExerciciosExpandidos] = useState<{[key: number]: boolean}>({});
  const [visualizacaoDetalhada, setVisualizacaoDetalhada] = useState<{[key: number]: boolean}>({});
  const [modalCargasOpen, setModalCargasOpen] = useState(false);
  const [exercicioSelecionado, setExercicioSelecionado] = useState<Exercicio | null>(null);
  const [cargas, setCargas] = useState<{[key: number]: number}>({});
  const [historico, setHistorico] = useState<HistoricoExercicio[]>([]);

  const treino = useLiveQuery(
    () => db.treinos.get(treinoId),
    [treinoId]
  );

  const exercicios = useLiveQuery(
    () => db.exercicios
      .where('treinoId')
      .equals(treinoId)
      .sortBy('ordem'),
    [treinoId]
  );

  const series = useLiveQuery(
    () => exercicios?.length 
      ? db.series
          .where('exercicioId')
          .anyOf(exercicios.map(e => e.id!))
          .sortBy('ordem')
      : [],
    [exercicios]
  );

  // Buscar histórico da semana anterior para cada exercício
  useEffect(() => {
    const buscarHistoricoSemanaAnterior = async () => {
      if (!exercicios?.length) return;

      const dataAtual = new Date();
      const dataInicioSemanaAnterior = new Date(dataAtual);
      dataInicioSemanaAnterior.setDate(dataAtual.getDate() - 7);

      const historicoTemp: {[key: number]: {[key: number]: number}} = {};

      for (const exercicio of exercicios) {
        if (!exercicio.id) continue;

        const registros = await db.historico
          .where('exercicioId')
          .equals(exercicio.id)
          .filter(registro => {
            const dataRegistro = new Date(registro.data);
            return dataRegistro >= dataInicioSemanaAnterior && dataRegistro < dataAtual;
          })
          .toArray();

        if (registros.length > 0) {
          // Agrupar por ordem da série
          const ultimoTreino = registros.reduce<{data: Date | null; registros: typeof registros}>((acc, registro) => {
            const dataRegistro = new Date(registro.data);
            if (!acc.data || dataRegistro > acc.data) {
              acc.data = dataRegistro;
              acc.registros = [registro];
            } else if (acc.data && dataRegistro.getTime() === acc.data.getTime()) {
              acc.registros.push(registro);
            }
            return acc;
          }, { data: null, registros: [] });

          if (ultimoTreino.data && exercicio.id) {
            historicoTemp[exercicio.id] = {};
            ultimoTreino.registros.forEach((registro, index) => {
              if (exercicio.id) {
                historicoTemp[exercicio.id][index + 1] = registro.repeticoes;
              }
            });
          }
        }
      }

      setHistoricoSemanaAnterior(historicoTemp);
    };

    buscarHistoricoSemanaAnterior();
  }, [exercicios]);

  const adicionarExercicio = async () => {
    if (!novoExercicioNome.trim()) return;

    try {
      const novoId = Date.now();
      
      const exercicio: Exercicio = {
        id: novoId,
        treinoId: Number(params.id),
        nome: novoExercicioNome,
        tipoExecucao,
        ordem: exercicios?.length || 0,
        numeroWorkSets: tipoExecucao === 'COMP' ? numeroWorkSets : numeroSeriesSimp,
        repeticoesMinimas,
        repeticoesMaximas,
        observacoes: ''
      };

      await db.exercicios.add(exercicio);

      const series: Serie[] = [];
      if (tipoExecucao === 'COMP') {
        // Warm Up
        series.push({
          id: Date.now(),
          exercicioId: novoId,
          tipo: 'warm-up' as TipoSerie,
          numero: 1,
          repeticoes: 15,
          peso: 0
        });

        // Feeders
        for (let i = 1; i <= 2; i++) {
          series.push({
            id: Date.now() + i,
            exercicioId: novoId,
            tipo: 'feeder' as TipoSerie,
            numero: i,
            repeticoes: 5,
            peso: 0
          });
        }

        // Work Sets
        for (let i = 1; i <= numeroWorkSets; i++) {
          series.push({
            id: Date.now() + i + 2,
            exercicioId: novoId,
            tipo: 'work-set' as TipoSerie,
            numero: i,
            repeticoes: repeticoesMinimas,
            peso: 0
          });
        }
      } else {
        // Séries SIMP (todas são Feeders)
        for (let i = 1; i <= numeroSeriesSimp; i++) {
          series.push({
            id: Date.now() + i,
            exercicioId: novoId,
            tipo: 'feeder' as TipoSerie,
            numero: i,
            repeticoes: repeticoesMinimas,
            peso: 0
          });
        }
      }

      await db.series.bulkAdd(series);
      setNovoExercicioNome('');
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
      alert('Erro ao adicionar exercício. Tente novamente.');
    }
  };

  const excluirExercicio = async (exercicioId: number) => {
    if (!exercicioId) {
      alert('ID do exercício inválido');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este exercício?')) {
      try {
        await db.series.where('exercicioId').equals(exercicioId).delete();
        await db.exercicios.delete(exercicioId);
      } catch (error) {
        console.error('Erro ao excluir exercício:', error);
        alert('Erro ao excluir exercício. Tente novamente.');
      }
    }
  };

  const atualizarSerie = async (serieId: number, novosDados: Partial<Serie>) => {
    try {
      if (!serieId) {
        throw new Error('ID da série inválido');
      }
      await db.series.update(serieId, novosDados);
    } catch (error) {
      console.error('Erro ao atualizar série:', error);
      alert('Erro ao atualizar série. Tente novamente.');
    }
  };

  const registrarExecucao = async (exercicioId: number, series: Serie[]) => {
    try {
      if (!exercicioId) {
        throw new Error('ID do exercício inválido');
      }

      const data = new Date();
      const historico: HistoricoExercicio[] = series.map(serie => ({
        id: Date.now() + serie.numero,
        exercicioId,
        data,
        peso: serie.peso,
        repeticoes: Number(repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`]) || serie.repeticoes,
        observacoes: observacoes[exercicioId]
      }));

      await db.historico.bulkAdd(historico);
      setHistorico(prev => [...prev, ...historico]);
      
      setRepeticoesFeitas(prev => {
        const newState = { ...prev };
        delete newState[exercicioId];
        return newState;
      });
      
      setObservacoes(prev => {
        const newState = { ...prev };
        delete newState[exercicioId];
        return newState;
      });
    } catch (error) {
      console.error('Erro ao registrar execução:', error);
      alert('Erro ao registrar execução. Tente novamente.');
    }
  };

  const EditarCargasModal = ({ exercicio, onClose }: { exercicio: Exercicio; onClose: () => void }) => {
    const seriesExercicio = series?.filter(s => s.exercicioId === exercicio.id) || [];
    const warmUp = seriesExercicio.find(s => s.tipo === 'warm-up');
    const feeders = seriesExercicio.filter(s => s.tipo === 'work-set' && s.numero <= 3);
    const workSets = seriesExercicio.filter(s => s.tipo === 'work-set' && s.numero > 3);

    const salvarCargas = async () => {
      try {
        // Atualizar warm-up
        if (warmUp && cargas[warmUp.id!]) {
          await atualizarSerie(warmUp.id!, { peso: cargas[warmUp.id!] });
        }

        // Atualizar feeders
        for (const feeder of feeders) {
          if (cargas[feeder.id!]) {
            await atualizarSerie(feeder.id!, { peso: cargas[feeder.id!] });
          }
        }

        // Atualizar work sets
        for (const workSet of workSets) {
          if (cargas[workSet.id!]) {
            await atualizarSerie(workSet.id!, { peso: cargas[workSet.id!] });
          }
        }

        onClose();
        router.refresh();
      } catch (error) {
        console.error('Erro ao salvar cargas:', error);
        alert('Erro ao salvar as cargas. Tente novamente.');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{exercicio.nome}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {warmUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warm-up</label>
                <input
                  type="number"
                  value={cargas[warmUp.id!] || ''}
                  onChange={(e) => setCargas(prev => ({ ...prev, [warmUp.id!]: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
              </div>
            )}

            {feeders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feeder Sets</label>
                {feeders.map((feeder, index) => (
                  <div key={feeder.id} className="flex items-center space-x-2 mb-2">
                    <span className="text-sm text-gray-600">Set {index + 1}:</span>
                    <input
                      type="number"
                      value={cargas[feeder.id!] || ''}
                      onChange={(e) => setCargas(prev => ({ ...prev, [feeder.id!]: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}

            {workSets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Sets</label>
                {workSets.map((workSet, index) => (
                  <div key={workSet.id} className="flex items-center space-x-2 mb-2">
                    <span className="text-sm text-gray-600">Set {index + 1}:</span>
                    <input
                      type="number"
                      value={cargas[workSet.id!] || ''}
                      onChange={(e) => setCargas(prev => ({ ...prev, [workSet.id!]: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              onClick={salvarCargas}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!treino) {
    return <div>Carregando...</div>;
  }

  return (
    <main className="container mx-auto p-4 max-w-7xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
        <Link href="/" className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{treino.nome}</h1>
          <p className="text-sm text-gray-600 mt-1">{treino.diaDaSemana !== undefined ? diasDaSemana[treino.diaDaSemana] : ''}</p>
        </div>
        <button
          onClick={() => setMostrarInstrucoes(!mostrarInstrucoes)}
          className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
          title={mostrarInstrucoes ? "Ocultar Instruções" : "Ver Instruções"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            {mostrarInstrucoes ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            )}
          </svg>
        </button>
      </div>

      {/* Instruções */}
      {mostrarInstrucoes && (
        <div className="bg-blue-50 p-6 rounded-xl mb-8 shadow-sm">
          <h3 className="text-xl font-bold text-blue-900 mb-4">Instruções de Execução</h3>
          <div className="space-y-4 text-base">
            <div>
              <h4 className="font-semibold text-lg text-blue-800 mb-2">Exercícios COMP (Complexos)</h4>
              <ul className="list-disc pl-6 space-y-2 text-blue-900">
                <li>1 série de aquecimento (Warm up): Peso para 20 repetições, fazer ~15 reps, descanso de 30s</li>
                <li>2 séries preparatórias (Feeders): Peso para 10-12 repetições, fazer 5 reps, descanso de 1 min</li>
                <li>Séries principais (Work sets): Peso para falhar entre as repetições definidas, descanso de 2 min</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-lg text-blue-800 mb-2">Exercícios SIMP (Simplificados)</h4>
              <ul className="list-disc pl-6 space-y-2 text-blue-900">
                <li>Séries convencionais com 2 minutos de descanso</li>
                <li>Peso para falhar entre as repetições definidas</li>
              </ul>
            </div>
            <p className="text-blue-800 font-medium mt-4 p-3 bg-blue-100 rounded-lg">
              Importante: Nas duas primeiras séries (tanto COMP quanto SIMP), manter 1-2 repetições na reserva.
              Apenas na última série pode-se chegar mais próximo da falha.
            </p>
          </div>
        </div>
      )}

      {/* Formulário de Novo Exercício */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Adicionar Exercício</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Exercício
            </label>
            <input
              type="text"
              value={novoExercicioNome}
              onChange={(e) => setNovoExercicioNome(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Supino Reto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Execução
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setTipoExecucao('SIMP')}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  tipoExecucao === 'SIMP'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-200'
                }`}
              >
                Simples
              </button>
              <button
                onClick={() => setTipoExecucao('COMP')}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  tipoExecucao === 'COMP'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-200'
                }`}
              >
                Complexa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repetições Mínimas
              </label>
              <input
                type="number"
                value={repeticoesMinimas}
                onChange={(e) => setRepeticoesMinimas(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repetições Máximas
              </label>
              <input
                type="number"
                value={repeticoesMaximas}
                onChange={(e) => setRepeticoesMaximas(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
              />
            </div>
          </div>

          {tipoExecucao === 'COMP' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Work Sets
              </label>
              <input
                type="number"
                value={numeroWorkSets}
                onChange={(e) => setNumeroWorkSets(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="10"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Séries
              </label>
              <input
                type="number"
                value={numeroSeriesSimp}
                onChange={(e) => setNumeroSeriesSimp(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="10"
              />
            </div>
          )}

          <button
            onClick={adicionarExercicio}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Adicionar Exercício</span>
          </button>
        </div>
      </div>

      {/* Lista de Exercícios */}
      <div className="space-y-6">
        {exercicios?.map((exercicio) => {
          const seriesDoExercicio = series?.filter(s => s.exercicioId === exercicio.id) || [];
          const exercicioId = exercicio.id!;
          const isExpandido = exerciciosExpandidos[exercicioId];
          
          return (
            <div
              key={exercicioId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="p-4">
                <div className="flex flex-col items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{exercicio.nome}</h2>
                  <div className="flex items-center justify-center space-x-6">
                    {exercicio.tipoExecucao === 'SIMP' ? (
                      <div className="flex flex-col items-center">
                        <label className="text-sm font-medium text-gray-600 mb-1">Carga</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={seriesDoExercicio[0]?.peso || 0}
                            onChange={(e) => {
                              const novoPeso = Number(e.target.value);
                              seriesDoExercicio.forEach(serie => {
                                if (serie.id) {
                                  atualizarSerie(serie.id, { peso: novoPeso });
                                }
                              });
                            }}
                            className="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                            min="0"
                            step="0.5"
                            placeholder="0"
                          />
                          <span className="text-base text-gray-600">kg</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <label className="text-sm font-medium text-gray-600 mb-1">Cargas</label>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">Warm Up</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={seriesDoExercicio.find(s => s.tipo === 'warm-up')?.peso || 0}
                                onChange={(e) => {
                                  const novoPeso = Number(e.target.value);
                                  const serie = seriesDoExercicio.find(s => s.tipo === 'warm-up');
                                  if (serie?.id) {
                                    atualizarSerie(serie.id, { peso: novoPeso });
                                  }
                                }}
                                className="w-16 px-2 py-1 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                min="0"
                                step="0.5"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500">kg</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">Feeders</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={seriesDoExercicio.find(s => s.tipo === 'feeder')?.peso || 0}
                                onChange={(e) => {
                                  const novoPeso = Number(e.target.value);
                                  seriesDoExercicio
                                    .filter(s => s.tipo === 'feeder')
                                    .forEach(serie => {
                                      if (serie.id) {
                                        atualizarSerie(serie.id, { peso: novoPeso });
                                      }
                                    });
                                }}
                                className="w-16 px-2 py-1 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                min="0"
                                step="0.5"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500">kg</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500">Work Sets</span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={seriesDoExercicio.find(s => s.tipo === 'work-set')?.peso || 0}
                                onChange={(e) => {
                                  const novoPeso = Number(e.target.value);
                                  seriesDoExercicio
                                    .filter(s => s.tipo === 'work-set')
                                    .forEach(serie => {
                                      if (serie.id) {
                                        atualizarSerie(serie.id, { peso: novoPeso });
                                      }
                                    });
                                }}
                                className="w-16 px-2 py-1 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                min="0"
                                step="0.5"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500">kg</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="h-10 w-px bg-gray-200"></div>

                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-600 mb-1">Meta</span>
                      <span className="text-lg font-medium text-gray-900 px-3 py-1 bg-gray-100 rounded-lg">
                        {exercicio.repeticoesMinimas}-{exercicio.repeticoesMaximas}
                      </span>
                      <span className="text-sm text-gray-500 mt-1">repetições</span>
                    </div>

                    <div className="h-10 w-px bg-gray-200"></div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setVisualizacaoDetalhada(prev => ({
                          ...prev,
                          [exercicioId]: !prev[exercicioId]
                        }))}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                        title={visualizacaoDetalhada[exercicioId] ? "Visualização Simples" : "Visualização Detalhada"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          {visualizacaoDetalhada[exercicioId] ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                          )}
                        </svg>
                      </button>
                      <button
                        onClick={() => exercicio.id && excluirExercicio(exercicio.id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Excluir Exercício"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Histórico Simples */}
                  {!visualizacaoDetalhada[exercicioId] && (
                    <div className="space-y-3">
                      {seriesDoExercicio.map((serie) => (
                        <div
                          key={serie.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-base font-medium text-gray-700 w-24">
                              {exercicio.tipoExecucao === 'SIMP' 
                                ? `Feeder ${serie.numero}`
                                : serie.tipo === 'warm-up' 
                                  ? 'Warm Up' 
                                  : serie.tipo === 'feeder'
                                    ? `Feeder ${serie.numero}`
                                    : `Work Set ${serie.numero}`}
                            </span>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-500">
                                {serie.tipo === 'warm-up' ? '15-20 reps' :
                                 exercicio.tipoExecucao === 'SIMP' ? `${exercicio.repeticoesMinimas}-${exercicio.repeticoesMaximas} reps` :
                                 serie.tipo === 'feeder' ? '5 reps' :
                                 `${exercicio.repeticoesMinimas}-${exercicio.repeticoesMaximas} reps`}
                              </span>
                              {historicoSemanaAnterior[exercicioId]?.[serie.numero] && (
                                <div className="flex items-center space-x-1 text-sm bg-blue-50 px-3 py-2 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-blue-600 font-medium">
                                    {historicoSemanaAnterior[exercicioId][serie.numero]}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            {(serie.tipo === 'work-set' && serie.numero > 3) && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] || ''}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setRepeticoesFeitas(prev => ({
                                      ...prev,
                                      [exercicioId]: {
                                        ...prev[exercicioId],
                                        [`serie-${serie.id}`]: value
                                      }
                                    }));
                                  }}
                                  className="w-20 px-3 py-2 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                                  placeholder="0"
                                />
                                <span className="text-base text-gray-600">reps</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-3">
                              {repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] && (
                                <div className="flex items-center space-x-1 text-sm bg-green-50 px-3 py-2 rounded-lg">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-500">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-green-600 font-medium">
                                    {repeticoesFeitas[exercicioId][`serie-${serie.id}`]}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {exercicio.tipoExecucao === 'SIMP' && (
                        <div className="mt-4 space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <label className="block text-sm text-gray-600 mb-1">
                              Observações
                            </label>
                            <textarea
                              value={observacoes[exercicioId] || ''}
                              onChange={(e) => setObservacoes(prev => ({
                                ...prev,
                                [exercicioId]: e.target.value
                              }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              rows={2}
                              placeholder="Registre aqui suas observações sobre o treino..."
                            />
                          </div>

                          <button
                            onClick={() => exercicio.id && registrarExecucao(exercicio.id, seriesDoExercicio)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Registrar Execução</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Histórico Detalhado */}
                  {visualizacaoDetalhada[exercicioId] && (
                    <div className="space-y-4">
                      {seriesDoExercicio.map((serie) => (
                        <div
                          key={serie.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {exercicio.tipoExecucao === 'SIMP' 
                                ? `Feeder ${serie.numero}`
                                : serie.tipo === 'warm-up' 
                                  ? 'Warm Up' 
                                  : serie.tipo === 'feeder'
                                    ? `Feeder ${serie.numero}`
                                    : `Work Set ${serie.numero}`}
                            </h3>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">
                                Descanso: {serie.numero <= 3 ? 1 : 2} min
                              </span>
                              {serie.tipo === 'work-set' && serie.numero > 3 && (
                                <span className="text-sm text-gray-600">
                                  Meta: {exercicio.repeticoesMinimas}-{exercicio.repeticoesMaximas} reps
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Peso (kg)
                              </label>
                              <input
                                type="number"
                                value={serie.peso}
                                onChange={(e) => serie.id && atualizarSerie(serie.id, {
                                  peso: Number(e.target.value)
                                })}
                                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg text-center"
                                min="0"
                                step="0.5"
                              />
                            </div>

                            {serie.tipo === 'work-set' && serie.numero > 3 && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Repetições realizadas
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setRepeticoesFeitas(prev => ({
                                        ...prev,
                                        [exercicioId]: {
                                          ...prev[exercicioId],
                                          [`serie-${serie.id}`]: value
                                        }
                                      }));
                                    }}
                                    className="flex-1 px-3 py-2 text-base border border-gray-300 rounded-lg text-center"
                                    placeholder="0"
                                  />
                                  {historicoSemanaAnterior[exercicioId]?.[serie.numero] && (
                                    <div className="flex items-center space-x-1 text-sm bg-blue-50 px-3 py-2 rounded-lg">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-500">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-blue-600 font-medium">
                                        {historicoSemanaAnterior[exercicioId][serie.numero]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] && (
                            <div className="mt-2 flex items-center space-x-1 text-sm text-green-600">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Registrado: {repeticoesFeitas[exercicioId][`serie-${serie.id}`]} repetições</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {exercicio.tipoExecucao === 'SIMP' && (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Observações (opcional)
                            </label>
                            <textarea
                              value={observacoes[exercicioId] || ''}
                              onChange={(e) => setObservacoes(prev => ({
                                ...prev,
                                [exercicioId]: e.target.value
                              }))}
                              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg"
                              rows={2}
                              placeholder="Registre aqui suas observações sobre o treino..."
                            />
                          </div>

                          <button
                            onClick={() => exercicio.id && registrarExecucao(exercicio.id, seriesDoExercicio)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-base transition-colors duration-200"
                          >
                            Registrar Execução
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de edição de cargas */}
      {modalCargasOpen && exercicioSelecionado && (
        <EditarCargasModal
          exercicio={exercicioSelecionado}
          onClose={() => {
            setModalCargasOpen(false);
            setExercicioSelecionado(null);
            setCargas({});
          }}
        />
      )}
    </main>
  );
} 