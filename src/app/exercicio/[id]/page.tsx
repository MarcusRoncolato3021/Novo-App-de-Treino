'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, Exercicio, Serie, TipoExecucao } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { TipoSerie } from '@/types/serie';

interface HistoricoRegistro {
  id: number;
  exercicioId: number;
  data: Date;
  tipo: TipoSerie;
  peso: number;
  repeticoes: number;
}

export default function ExercicioPage() {
  const params = useParams();
  const router = useRouter();
  
  if (!params?.id) {
    return <div>Parâmetros inválidos</div>;
  }

  const exercicioId = Number(params.id);
  const [repeticoes, setRepeticoes] = useState<{[key: number]: number}>({});
  const [isRegistrando, setIsRegistrando] = useState(false);
  const [historicoAnterior, setHistoricoAnterior] = useState<{[key: number]: {repeticoes: number, peso: number}}>({});
  const [cargas, setCargas] = useState<{[key: string]: number | null}>({
    warmUp: null,
    feeder: null,
    workSet: null
  });
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [novaMetaMin, setNovaMetaMin] = useState('');
  const [novaMetaMax, setNovaMetaMax] = useState('');
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [numeroSeries, setNumeroSeries] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [workSetDescanso, setWorkSetDescanso] = useState(2); // Intervalo padrão para work sets em minutos
  const [warmUpDescanso, setWarmUpDescanso] = useState(30); // Intervalo padrão para warm up em segundos
  const [feederDescanso, setFeederDescanso] = useState(1); // Intervalo padrão para feeders em minutos

  const exercicio = useLiveQuery(
    () => db.exercicios.get(exercicioId),
    [exercicioId]
  );

  const series = useLiveQuery(
    async () => {
      if (!exercicioId) return null;

      const allSeries = await db.series
      .where('exercicioId')
      .equals(exercicioId)
        .toArray();
      
      return allSeries.sort((a, b) => a.numero - b.numero);
    },
    [exercicioId]
  );

  // Buscar histórico em tempo real
  const ultimoHistorico = useLiveQuery(
    async () => {
      if (!exercicioId) return null;

      const registros = await db.historico
      .where('exercicioId')
      .equals(exercicioId)
      .reverse()
        .sortBy('data');

      if (registros.length > 0) {
        const ultimaData = registros[0].data;
        return registros.filter(r => r.data.getTime() === ultimaData.getTime())
          .sort((a, b) => a.ordem - b.ordem);
      }
      return null;
    },
    [exercicioId]
  );

  // Atualizar histórico e carga quando houver mudanças
  useEffect(() => {
    if (ultimoHistorico && ultimoHistorico.length > 0 && exercicio) {
      const historico: {[key: number]: {repeticoes: number, peso: number}} = {};
      
      if (exercicio.tipoExecucao === 'COMP') {
        // Para exercícios COMP, organizar o histórico mantendo a ordem correta
        ultimoHistorico.forEach(registro => {
          if (registro.tipo === 'warm-up') {
            historico[1] = {
              repeticoes: registro.repeticoes,
              peso: registro.peso
            };
            // Atualizar a carga do warm-up
            setCargas(prev => ({
              ...prev,
              warmUp: registro.peso
            }));
          } else if (registro.tipo === 'feeder') {
            const ordemExibicao = registro.ordem + 2;
            historico[ordemExibicao] = {
              repeticoes: registro.repeticoes,
              peso: registro.peso
            };
            // Atualizar a carga do feeder
            setCargas(prev => ({
              ...prev,
              feeder: registro.peso
            }));
          } else if (registro.tipo === 'work-set') {
            const ordemExibicao = registro.ordem + 3;
            historico[ordemExibicao] = {
              repeticoes: registro.repeticoes,
              peso: registro.peso
            };
            // Atualizar a carga dos work sets
            setCargas(prev => ({
              ...prev,
              workSet: registro.peso
            }));
          }
        });
      } else {
        // Para exercícios SIMP, mantém exatamente como está
        ultimoHistorico.forEach(registro => {
          historico[registro.ordem] = {
            repeticoes: registro.repeticoes,
            peso: registro.peso
          };
          // Atualizar a carga dos work sets
          setCargas(prev => ({
            ...prev,
            workSet: registro.peso
          }));
        });
      }

      setHistoricoAnterior(historico);
    }
  }, [ultimoHistorico, exercicio]);

  // Função para atualizar a carga de uma série
  const atualizarCargaSerie = async (serieId: number, valor: string) => {
    try {
      const valorNumerico = valor === '' ? 0 : Number(valor);
      await db.series.update(serieId, { peso: valorNumerico });
    } catch (error) {
      console.error('Erro ao atualizar carga da série:', error);
    }
  };

  const handleCargaChange = (tipo: 'warmUp' | 'feeder' | 'workSet', valor: string) => {
    const valorNumerico = valor === '' ? null : Number(valor);
    setCargas(prev => ({
      ...prev,
      [tipo]: valorNumerico
    }));
  };

  const handleRepChange = (serieId: number, value: string) => {
    const numeroReps = parseInt(value) || 0;
    setRepeticoes(prev => ({
      ...prev,
      [serieId]: numeroReps
    }));
  };

  const todasRepeticoesPreenchidas = () => {
    if (!series || !exercicio) return false;
    return series.every(serie => {
      if (!serie.id) return false;
      
      // Para exercícios COMP, Warm Up e Feeder Sets têm repetições fixas
      if (exercicio.tipoExecucao === 'COMP') {
        if (serie.numero <= 3) {
          return true; // Warm-up e Feeders têm repetições fixas
        }
        // Verificar work sets
        const reps = repeticoes[serie.id];
        return typeof reps === 'number' && reps > 0;
      }

      // Para exercícios SIMP, todas as séries precisam ter repetições
      const reps = repeticoes[serie.id];
      return typeof reps === 'number' && reps > 0;
    });
  };

  const handleCompletarSerie = async () => {
    if (!exercicio || !series || !todasRepeticoesPreenchidas()) {
      toast.error('Preencha todas as repetições antes de completar a série');
      return;
    }

    // Verificar se todas as cargas estão preenchidas
    if (cargas.workSet === null || 
        (exercicio.tipoExecucao === 'COMP' && (cargas.warmUp === null || cargas.feeder === null))) {
      toast.error('Preencha todas as cargas antes de completar a série');
      return;
    }

    try {
      setIsRegistrando(true);

      const seriesOrdenadas = [...series].sort((a, b) => a.numero - b.numero);

      const registros = seriesOrdenadas.map(serie => {
        let tipo: TipoSerie;
        let ordem: number;
        let peso: number = 0;

        if (exercicio.tipoExecucao === 'COMP') {
          if (serie.numero === 1) {
            tipo = 'warm-up';
            ordem = 0;
            peso = cargas.warmUp || 0;
          } else if (serie.numero === 2 || serie.numero === 3) {
            tipo = 'feeder';
            ordem = serie.numero - 2;
            peso = cargas.feeder || 0;
          } else {
            tipo = 'work-set';
            ordem = serie.numero - 3;
            peso = cargas.workSet || 0;
          }
        } else {
          tipo = 'work-set';
          ordem = serie.numero;
          peso = cargas.workSet || 0;
        }

        return {
          id: Date.now() + Math.random(),
          exercicioId,
          data: new Date(),
          repeticoes: exercicio.tipoExecucao === 'COMP' ? (
            serie.numero === 1 ? 15 : 
            (serie.numero === 2 || serie.numero === 3) ? 5 : 
            repeticoes[serie.id!]
          ) : repeticoes[serie.id!],
          peso,
          tipo,
          ordem,
          observacoes: observacao.trim()
        };
      });

      await db.historico.bulkAdd(registros);
      
      // Atualizar as cargas nas séries
      for (const serie of seriesOrdenadas) {
        if (!serie.id) continue;
        
        let novaPeso = 0;
        if (exercicio.tipoExecucao === 'COMP') {
          if (serie.numero === 1) {
            novaPeso = cargas.warmUp || 0;
          } else if (serie.numero === 2 || serie.numero === 3) {
            novaPeso = cargas.feeder || 0;
          } else {
            novaPeso = cargas.workSet || 0;
          }
        } else {
          novaPeso = cargas.workSet || 0;
        }
        
        await db.series.update(serie.id, { peso: novaPeso });
      }

      // Limpar apenas as repetições, mantendo as observações
      setRepeticoes({});
      setIsRegistrando(false);
      toast.success('Série completada com sucesso!');
    } catch (error) {
      console.error('Erro ao completar exercício:', error);
      toast.error('Erro ao completar exercício');
      setIsRegistrando(false);
    }
  };

  // Função para obter o título da série
  const getTituloSerie = (numero: number, tipoExecucao: TipoExecucao) => {
    if (tipoExecucao === 'COMP') {
      if (numero === 1) return 'Warm Up';
      if (numero === 2) return 'Feeder 1';
      if (numero === 3) return 'Feeder 2';
      return `Work Set ${numero - 3}`;
    }
    return `Work Set ${numero}`;
  };

  // Função para obter as repetições fixas para séries especiais
  const getRepeticoesFixas = (numero: number, tipoExecucao: TipoExecucao) => {
    if (tipoExecucao === 'COMP') {
      if (numero === 1) return 15; // Warm Up
      if (numero === 2 || numero === 3) return 5; // Feeders
    }
    return undefined; // Work Sets não têm repetições fixas
  };

  // Função para obter o tempo de descanso com base no tipo de série
  const getTempoDescanso = (serieNumero: number, tipoExecucao: TipoExecucao): string => {
    if (tipoExecucao === 'COMP') {
      if (serieNumero === 1) return `${warmUpDescanso}s`; // Warm Up
      if (serieNumero === 2 || serieNumero === 3) return `${feederDescanso}min`; // Feeders
    }
    return `${workSetDescanso}min`; // Work Sets
  };

  // Log para debug
  useEffect(() => {
    if (series) {
      console.log('Séries renderizadas:', series);
    }
  }, [series]);

  const handleDeleteExercicio = async () => {
    if (!exercicio) return;

    const confirmar = window.confirm(`Tem certeza que deseja excluir o exercício "${exercicio.nome}"?`);
    if (!confirmar) return;

    try {
      // Deletar o exercício e suas séries
      await db.exercicios.delete(exercicioId);
      await db.series.where('exercicioId').equals(exercicioId).delete();
      
      // Voltar para a página do treino
      router.push(`/treino/${exercicio.treinoId}`);
      toast.success('Exercício excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir exercício:', error);
      toast.error('Erro ao excluir exercício');
    }
  };

  const handleIncrementarCarga = () => {
    const valorAtual = cargas.workSet || 0;
    const novaCarga = valorAtual + 2.5;
    handleCargaChange('workSet', novaCarga.toString());
  };

  const handleSaveNome = async () => {
    if (!exercicio || !novoNome.trim()) {
      toast.error('O nome do exercício não pode ficar vazio');
      return;
    }

    try {
      await db.exercicios.update(exercicioId, { nome: novoNome.trim() });
      setEditandoNome(false);
      toast.success('Nome atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      toast.error('Erro ao atualizar o nome');
    }
  };

  const handleSaveMeta = async () => {
    if (!exercicio || !exercicio.id) return;

    const min = parseInt(novaMetaMin);
    const max = parseInt(novaMetaMax);

    if (isNaN(min) || isNaN(max) || min < 0 || max < 0 || min > max) {
      toast.error('Valores inválidos para as metas');
      return;
    }

    try {
      await db.exercicios.update(exercicio.id, {
        metaMin: min,
        metaMax: max
      });
      setEditandoMeta(false);
      toast.success('Metas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar metas:', error);
      toast.error('Erro ao atualizar metas');
    }
  };

  const handleAjustarSeries = async () => {
    if (!exercicio || !series) return;

    try {
      const seriesAtuais = [...series].sort((a, b) => a.numero - b.numero);
      const seriesFixas = exercicio.tipoExecucao === 'COMP' ? 3 : 0;
      const workSetsAtuais = seriesAtuais.length - seriesFixas;
      
      if (numeroSeries === workSetsAtuais) {
        setShowSeriesModal(false);
        return;
      }

      if (numeroSeries > workSetsAtuais) {
        // Adicionar novas séries
        const novasSeries = [];
        for (let i = workSetsAtuais + 1; i <= numeroSeries; i++) {
          novasSeries.push({
            exercicioId,
            numero: i + seriesFixas,
            peso: cargas.workSet || 0,
            tipo: 'work-set' as TipoSerie
          });
        }
        await db.series.bulkAdd(novasSeries);
      } else {
        // Remover séries excedentes, mantendo as séries fixas e o número desejado de work sets
        const seriesParaRemover = seriesAtuais
          .filter(s => s.numero > (seriesFixas + numeroSeries))
          .map(s => s.id)
          .filter((id): id is number => id !== undefined);
        
        await db.series.bulkDelete(seriesParaRemover);
      }

      setShowSeriesModal(false);
      toast.success('Número de séries atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao ajustar séries:', error);
      toast.error('Erro ao ajustar séries');
    }
  };

  useEffect(() => {
    if (exercicio) {
      setNovoNome(exercicio.nome);
      if (exercicio.metaMin !== undefined) {
        setNovaMetaMin(exercicio.metaMin.toString());
      }
      if (exercicio.metaMax !== undefined) {
        setNovaMetaMax(exercicio.metaMax.toString());
      }
    }
  }, [exercicio]);

  if (!exercicio || !series) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
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
              href={`/treino/${exercicio.treinoId}`}
              className="text-blue-600 hover:text-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            {editandoNome ? (
              <div className="flex-1 flex items-center justify-center space-x-2 mx-4">
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="flex-1 max-w-[200px] px-3 py-1 border border-gray-300 rounded-lg text-xl font-bold text-center text-blue-600 focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveNome();
                    } else if (e.key === 'Escape') {
                      setEditandoNome(false);
                      setNovoNome(exercicio.nome);
                    }
                  }}
                />
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleSaveNome}
                    className="text-green-600 p-1 hover:text-green-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setEditandoNome(false);
                      setNovoNome(exercicio.nome);
                    }}
                    className="text-gray-400 p-1 hover:text-gray-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center group mx-4">
                <h1 className="text-xl font-bold text-center text-blue-600">{exercicio.nome}</h1>
                <button
                  onClick={() => setEditandoNome(true)}
                  className="ml-2 text-gray-400 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  const seriesFixas = exercicio.tipoExecucao === 'COMP' ? 3 : 0;
                  setNumeroSeries(series.length - seriesFixas);
                  setShowSeriesModal(true);
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
              <button 
                onClick={handleDeleteExercicio}
                className="text-blue-600 hover:text-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
              <Link href={`/exercicio/${exercicioId}/historico`} className="text-blue-600 hover:text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {/* Modal para ajustar número de séries */}
            {showSeriesModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Ajustar Exercício
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-2">
                        {exercicio.tipoExecucao === 'COMP' ? 'Work Sets' : 'Séries'}
                      </h3>
                      
                      {exercicio.tipoExecucao === 'COMP' && (
                        <p className="text-sm text-gray-600 mb-4">
                          O exercício manterá 1 warm-up e 2 feeders, além dos work sets definidos abaixo.
                        </p>
                      )}

                      <div className="flex items-center justify-center space-x-4">
                        <button
                          onClick={() => setNumeroSeries(prev => Math.max(1, prev - 1))}
                          className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                          </svg>
                        </button>
                        
                        <div className="w-16 text-center">
                          <input
                            type="number"
                            value={numeroSeries}
                            onChange={(e) => setNumeroSeries(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full text-center border border-gray-300 rounded-lg px-2 py-1"
                            min="1"
                          />
                        </div>

                        <button
                          onClick={() => setNumeroSeries(prev => prev + 1)}
                          className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-gray-800 mb-2">Meta de Repetições</h3>
                      <div className="flex items-center justify-center space-x-2">
                        <input
                          type="number"
                          value={novaMetaMin}
                          onChange={(e) => setNovaMetaMin(e.target.value)}
                          placeholder="Mínimo"
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          value={novaMetaMax}
                          onChange={(e) => setNovaMetaMax(e.target.value)}
                          placeholder="Máximo"
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      onClick={() => {
                        setShowSeriesModal(false);
                        if (exercicio.metaMin !== undefined) {
                          setNovaMetaMin(exercicio.metaMin.toString());
                        }
                        if (exercicio.metaMax !== undefined) {
                          setNovaMetaMax(exercicio.metaMax.toString());
                        }
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        await handleSaveMeta();
                        await handleAjustarSeries();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex-1">
                  <h2 className="text-lg text-gray-700 mb-2">Carga Work Sets</h2>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={cargas.workSet === null ? '' : cargas.workSet}
                        onChange={(e) => handleCargaChange('workSet', e.target.value)}
                        className="w-20 px-3 py-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.5"
                        placeholder="0"
                      />
                      <button
                        onClick={handleIncrementarCarga}
                        className="ml-2 text-blue-500 hover:text-blue-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                      <span className="ml-2">kg</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h2 className="text-lg text-gray-700 mb-2">Metas</h2>
                  <p className="text-gray-600">
                    {exercicio.metaMin} - {exercicio.metaMax} repetições
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {series?.map((serie) => {
                  const serieNumero = serie.numero;
                  const workSetNumero = serieNumero - 3;
                  const isWorkSet = exercicio.tipoExecucao === 'COMP' && serieNumero > 3;
                  
                  if (exercicio.tipoExecucao === 'COMP' && serieNumero <= 3) {
                    return (
                      <div key={serie.id} className="bg-gray-50 rounded p-1.5">
                        <div className="flex justify-between items-center">
                          <div className="w-10"></div>
                          <h3 className="text-base font-semibold text-gray-800">
                            {serieNumero === 1 ? 'Warm Up' : `Feeder ${serieNumero - 1}`}
                          </h3>
                          <div className="flex items-center w-10 justify-end">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                              <span>{getTempoDescanso(serieNumero, exercicio.tipoExecucao)}</span>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const novoTempo = prompt(
                                    serieNumero === 1 
                                      ? 'Tempo de descanso (em segundos):' 
                                      : 'Tempo de descanso (em minutos):', 
                                    serieNumero === 1 
                                      ? warmUpDescanso.toString() 
                                      : feederDescanso.toString()
                                  );
                                  if (novoTempo !== null) {
                                    const tempo = parseInt(novoTempo);
                                    if (!isNaN(tempo) && tempo > 0) {
                                      if (serieNumero === 1) {
                                        setWarmUpDescanso(tempo);
                                        toast.success(`Tempo de descanso atualizado para ${tempo} segundos`);
                                      } else {
                                        setFeederDescanso(tempo);
                                        toast.success(`Tempo de descanso atualizado para ${tempo} minutos`);
                                      }
                                    }
                                  }
                                }}
                                className="ml-1 text-blue-600"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </button>
                            </span>
                          </div>
                        </div>

                        <div className="bg-white rounded p-1.5">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="w-full flex flex-col items-center">
                              <span className="text-xs text-gray-600">Carga</span>
                              <div className="flex items-center gap-0.5">
                                <input
                                  type="number"
                                  value={serie.numero === 1 ? (cargas.warmUp === null ? '' : cargas.warmUp) : (cargas.feeder === null ? '' : cargas.feeder)}
                                  onChange={(e) => handleCargaChange(serie.numero === 1 ? 'warmUp' : 'feeder', e.target.value)}
                                  className="w-12 h-6 px-0.5 text-center border rounded focus:ring-1 focus:ring-blue-500 border-gray-300 text-sm"
                                  min="0"
                                  step="0.5"
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-400 ml-0.5">kg</span>
                              </div>
                            </div>
                            <div className="w-full flex flex-col items-center">
                              <span className="text-xs text-gray-600">Reps</span>
                              <span className="text-sm font-medium text-gray-800">
                                {getRepeticoesFixas(serie.numero, exercicio.tipoExecucao)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={serie.id} className="bg-gray-50 rounded p-1.5">
                      <div className="flex justify-between items-center">
                        <div className="w-10"></div>
                        <h3 className="text-base font-semibold text-gray-800">
                          {exercicio.tipoExecucao === 'COMP' ? `Work Set ${workSetNumero}` : `Work Set ${serieNumero}`}
                        </h3>
                        <div className="flex items-center w-10 justify-end">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                            <span>{getTempoDescanso(serieNumero, exercicio.tipoExecucao)}</span>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const novoTempo = prompt('Tempo de descanso (em minutos):', workSetDescanso.toString());
                                if (novoTempo !== null) {
                                  const tempo = parseInt(novoTempo);
                                  if (!isNaN(tempo) && tempo > 0) {
                                    setWorkSetDescanso(tempo);
                                    toast.success(`Tempo de descanso atualizado para ${tempo} minutos`);
                                  }
                                }
                              }}
                              className="ml-1 text-blue-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-white rounded p-1.5">
                          <h4 className="text-xs font-medium text-gray-500 mb-1 text-center">Antes</h4>
                          <div className="flex flex-col items-center space-y-1">
                            <div className="w-full flex flex-col items-center">
                              <span className="text-xs text-gray-600">Carga</span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-sm font-medium text-blue-600">{historicoAnterior[serieNumero]?.peso === null ? '-' : historicoAnterior[serieNumero]?.peso}</span>
                                <span className="text-xs text-gray-400">kg</span>
                              </div>
                            </div>
                            <div className="w-full flex flex-col items-center">
                              <span className="text-xs text-gray-600">Reps</span>
                              <span className="text-sm font-medium text-blue-600">
                                {historicoAnterior[serieNumero]?.repeticoes === null ? '-' : historicoAnterior[serieNumero]?.repeticoes}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded p-1.5">
                          <h4 className="text-xs font-medium text-gray-500 mb-1 text-center">Hoje</h4>
                          <div className="flex flex-col items-center space-y-1">
                            <div className="w-full flex flex-col items-center">
                              <span className="text-xs text-gray-600">Carga</span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-sm font-medium text-gray-800">{cargas.workSet === null ? '-' : cargas.workSet}</span>
                                <span className="text-xs text-gray-400 ml-0.5">kg</span>
                              </div>
                            </div>
                            <div className="w-full flex flex-col items-center">
                              <span className="text-xs text-gray-600">Reps</span>
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  value={repeticoes[serie.id!] || ''}
                                  onChange={(e) => handleRepChange(serie.id!, e.target.value)}
                                  className="w-12 h-6 px-0.5 text-center border rounded focus:ring-1 focus:ring-blue-500 border-gray-300 text-sm"
                                  min="0"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCompletarSerie}
                disabled={!todasRepeticoesPreenchidas() || isRegistrando}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  todasRepeticoesPreenchidas() && !isRegistrando
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isRegistrando ? 'Registrando...' : 'Completar Exercício'}
              </button>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-base font-medium text-gray-700 mb-2">Observações</h3>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Adicione observações sobre o exercício (opcional)"
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 