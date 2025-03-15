'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Treino, Exercicio, Serie, TipoExecucao } from '@/lib/db';
import Link from 'next/link';

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
  const [tipoExecucao, setTipoExecucao] = useState<TipoExecucao>('SIMP');
  const [numeroSeries, setNumeroSeries] = useState(3);
  const [numeroWorkSets, setNumeroWorkSets] = useState(3);
  const [repeticoesMinimas, setRepeticoesMinimas] = useState(8);
  const [repeticoesMaximas, setRepeticoesMaximas] = useState(10);
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false);
  const [repeticoesFeitas, setRepeticoesFeitas] = useState<{[key: string]: {[key: string]: string}}>({});
  const [observacoes, setObservacoes] = useState<{[key: string]: string}>({});
  const [historicoSemanaAnterior, setHistoricoSemanaAnterior] = useState<{[key: number]: {[key: number]: number}}>({});
  const [exerciciosExpandidos, setExerciciosExpandidos] = useState<{[key: number]: boolean}>({});
  const [visualizacaoDetalhada, setVisualizacaoDetalhada] = useState<{[key: number]: boolean}>({});

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
    if (!novoExercicioNome.trim()) {
      alert('Por favor, insira um nome para o exercício.');
      return;
    }

    const novoExercicio: Exercicio = {
      treinoId,
      nome: novoExercicioNome,
      tipoExecucao,
      ordem: (exercicios?.length || 0) + 1,
      numeroWorkSets: tipoExecucao === 'COMP' ? numeroWorkSets : undefined,
      numeroSeries: tipoExecucao === 'SIMP' ? numeroSeries : undefined,
      repeticoesMinimas,
      repeticoesMaximas
    };

    const exercicioId = await db.exercicios.add(novoExercicio);

    if (tipoExecucao === 'COMP') {
      // Warm up (1 série)
      await db.series.add({
        exercicioId,
        tipo: 'WARM_UP',
        pesoAtual: 0,
        repeticoesMinimas: 15,
        repeticoesMaximas: 20,
        tempoDescanso: 30,
        ordem: 1
      });

      // Feeders (2 séries)
      for (let i = 0; i < 2; i++) {
        await db.series.add({
          exercicioId,
          tipo: 'FEEDER',
          pesoAtual: 0,
          repeticoesMinimas: 5,
          repeticoesMaximas: 5,
          tempoDescanso: 60,
          ordem: 2 + i
        });
      }

      // Work sets
      for (let i = 0; i < numeroWorkSets; i++) {
        await db.series.add({
          exercicioId,
          tipo: 'WORK_SET',
          pesoAtual: 0,
          repeticoesMinimas,
          repeticoesMaximas,
          tempoDescanso: 120,
          ordem: 4 + i
        });
      }
    } else {
      // Séries simples
      for (let i = 0; i < numeroSeries; i++) {
        await db.series.add({
          exercicioId,
          tipo: 'SIMPLES',
          pesoAtual: 0,
          repeticoesMinimas,
          repeticoesMaximas,
          tempoDescanso: 120,
          ordem: 1 + i
        });
      }
    }

    setNovoExercicioNome('');
  };

  const excluirExercicio = async (exercicioId: number) => {
    if (confirm('Tem certeza que deseja excluir este exercício?')) {
      await db.series.where('exercicioId').equals(exercicioId).delete();
      await db.exercicios.delete(exercicioId);
    }
  };

  const atualizarSerie = async (serieId: number, novosDados: Partial<Serie>) => {
    await db.series.update(serieId, novosDados);
  };

  const registrarExecucao = async (exercicioId: number, series: Serie[]) => {
    const seriesSimples = series.filter(s => s.tipo === 'SIMPLES');
    const faltamRepeticoes = seriesSimples.some(serie => 
      !repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] || 
      repeticoesFeitas[exercicioId][`serie-${serie.id}`].trim() === ''
    );

    if (faltamRepeticoes) {
      alert('Por favor, registre as repetições realizadas em todas as séries antes de salvar.');
      return;
    }

    const data = new Date();
    
    for (const serie of seriesSimples) {
      const repeticoes = Number(repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] || 0);
      
      await db.historico.add({
        exercicioId,
        data,
        peso: serie.pesoAtual,
        repeticoes,
        tipo: 'SIMPLES',
        observacoes: `Meta: ${serie.repeticoesMinimas}-${serie.repeticoesMaximas} reps | Realizadas: ${repeticoes} reps${observacoes[exercicioId] ? ' | Obs: ' + observacoes[exercicioId] : ''}`
      });
    }

    // Limpar o formulário apenas para este exercício
    setRepeticoesFeitas(prev => ({
      ...prev,
      [exercicioId]: {}
    }));
    setObservacoes(prev => ({
      ...prev,
      [exercicioId]: ''
    }));
    
    alert('Execução registrada com sucesso!');
    router.refresh();
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
          <p className="text-sm text-gray-600 mt-1">{diasDaSemana[treino.diaDaSemana]}</p>
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

      {/* Formulário de Adição */}
      <div className="bg-white p-8 rounded-xl shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Adicionar Exercício</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="nomeExercicio" className="block text-lg font-medium text-gray-700 mb-2">
              Nome do Exercício
            </label>
            <input
              type="text"
              id="nomeExercicio"
              value={novoExercicioNome}
              onChange={(e) => setNovoExercicioNome(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Supino Reto"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="tipoExecucao" className="block text-lg font-medium text-gray-700 mb-2">
                Tipo de Execução
              </label>
              <select
                id="tipoExecucao"
                value={tipoExecucao}
                onChange={(e) => setTipoExecucao(e.target.value as TipoExecucao)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SIMP">Simplificada</option>
                <option value="COMP">Complexa</option>
              </select>
            </div>

            {tipoExecucao === 'COMP' ? (
              <div>
                <label htmlFor="numeroWorkSets" className="block text-lg font-medium text-gray-700 mb-2">
                  Número de Work Sets
                </label>
                <input
                  type="number"
                  id="numeroWorkSets"
                  value={numeroWorkSets}
                  onChange={(e) => setNumeroWorkSets(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="numeroSeries" className="block text-lg font-medium text-gray-700 mb-2">
                  Número de Séries
                </label>
                <input
                  type="number"
                  id="numeroSeries"
                  value={numeroSeries}
                  onChange={(e) => setNumeroSeries(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="repeticoesMinimas" className="block text-lg font-medium text-gray-700 mb-2">
                Repetições Mínimas
              </label>
              <input
                type="number"
                id="repeticoesMinimas"
                value={repeticoesMinimas}
                onChange={(e) => setRepeticoesMinimas(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="repeticoesMaximas" className="block text-lg font-medium text-gray-700 mb-2">
                Repetições Máximas
              </label>
              <input
                type="number"
                id="repeticoesMaximas"
                value={repeticoesMaximas}
                onChange={(e) => setRepeticoesMaximas(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={adicionarExercicio}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors duration-200 mt-6"
          >
            Adicionar Exercício
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
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{exercicio.nome}</h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setVisualizacaoDetalhada(prev => ({
                        ...prev,
                        [exercicioId]: !prev[exercicioId]
                      }))}
                      className="text-blue-600 hover:text-blue-800 text-base font-medium transition-colors duration-200"
                    >
                      {visualizacaoDetalhada[exercicioId] ? 'Visualização Simples' : 'Visualização Detalhada'}
                    </button>
                    <button
                      onClick={() => exercicio.id && excluirExercicio(exercicio.id)}
                      className="text-red-600 hover:text-red-800 text-base font-medium transition-colors duration-200"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Histórico Simples */}
                  {!visualizacaoDetalhada[exercicioId] && (
                    <div className="space-y-2">
                      {seriesDoExercicio.map((serie) => (
                        <div
                          key={serie.id}
                          className="flex items-center space-x-4 p-2 hover:bg-gray-50 rounded-lg"
                        >
                          <span className="text-lg font-medium text-gray-900 w-24">
                            {serie.ordem}ª Série
                          </span>
                          <span className="text-lg text-gray-600">
                            {serie.pesoAtual}kg
                          </span>
                          <span className="text-lg text-gray-600">
                            {repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] || '-'} reps
                          </span>
                          {historicoSemanaAnterior[exercicioId]?.[serie.ordem] && (
                            <span className="text-sm text-blue-600">
                              (anterior: {historicoSemanaAnterior[exercicioId][serie.ordem]} reps)
                            </span>
                          )}
                        </div>
                      ))}
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
                              {serie.ordem}ª Série
                            </h3>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">
                                Descanso: {serie.tempoDescanso / 60} min
                              </span>
                              {serie.tipo === 'SIMPLES' && (
                                <span className="text-sm text-gray-600">
                                  Meta: {serie.repeticoesMinimas}-{serie.repeticoesMaximas} reps
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
                                value={serie.pesoAtual}
                                onChange={(e) => serie.id && atualizarSerie(serie.id, {
                                  pesoAtual: Number(e.target.value)
                                })}
                                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg text-center"
                                min="0"
                                step="0.5"
                              />
                            </div>

                            {serie.tipo === 'SIMPLES' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Repetições realizadas
                                </label>
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
                                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg text-center"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>

                          {historicoSemanaAnterior[exercicioId]?.[serie.ordem] && (
                            <div className="mt-2 text-sm text-blue-600">
                              Semana anterior: {historicoSemanaAnterior[exercicioId][serie.ordem]} reps
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
                            onClick={() => registrarExecucao(exercicioId, seriesDoExercicio)}
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
    </main>
  );
} 