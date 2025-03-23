'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, Exercicio, Serie, TipoExecucao, TipoSerie, isDatabaseReady } from '@/lib/db';
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
  const [historicoSemanaAnterior, setHistoricoSemanaAnterior] = useState<{[key: number]: {[key: number]: {repeticoes: number, peso: number}}}>({});
  const [exerciciosExpandidos, setExerciciosExpandidos] = useState<{[key: number]: boolean}>({});
  const [visualizacaoDetalhada, setVisualizacaoDetalhada] = useState<{[key: number]: boolean}>({});
  const [modalCargasOpen, setModalCargasOpen] = useState(false);
  const [exercicioSelecionado, setExercicioSelecionado] = useState<Exercicio | null>(null);
  const [cargas, setCargas] = useState<{[key: number]: number}>({});
  const [historico, setHistorico] = useState<HistoricoExercicio[]>([]);
  const [modalEditarExercicioOpen, setModalEditarExercicioOpen] = useState(false);
  const [exercicioParaEditar, setExercicioParaEditar] = useState<Exercicio | null>(null);
  const [editarExercicioNome, setEditarExercicioNome] = useState('');
  const [editarRepeticoesMinimas, setEditarRepeticoesMinimas] = useState(8);
  const [editarRepeticoesMaximas, setEditarRepeticoesMaximas] = useState(12);

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

      const historicoTemp: {[key: number]: {[key: number]: {repeticoes: number, peso: number}}} = {};

      for (const exercicio of exercicios) {
        if (!exercicio.id) continue;

        const registros = await db.historico
          .where('exercicioId')
          .equals(exercicio.id)
          .filter(registro => {
            const dataRegistro = new Date(registro.data);
            return dataRegistro >= dataInicioSemanaAnterior && dataRegistro < dataAtual;
          })
          .reverse()
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
                historicoTemp[exercicio.id][index + 1] = {
                  repeticoes: registro.repeticoes,
                  peso: registro.peso
                };
              }
            });
          }
        }
      }

      setHistoricoSemanaAnterior(historicoTemp);
    };

    buscarHistoricoSemanaAnterior();
  }, [exercicios]);

  // Inicializar repetições para exercícios COMP
  useEffect(() => {
    if (!exercicios || !series) return;

    const novoEstado = { ...repeticoesFeitas };
    let mudou = false;
    
    exercicios.forEach(exercicio => {
      if (!exercicio.id) return;
      const exercicioId = exercicio.id;
      
      if (!novoEstado[exercicioId]) {
        novoEstado[exercicioId] = {};
        mudou = true;
      }

      const seriesExercicio = series.filter(s => s.exercicioId === exercicioId);
      
      seriesExercicio.forEach(serie => {
        if (!serie.id) return;
        const serieId = serie.id;
        
        const chave = `serie-${serieId}`;
        if (exercicio.tipo === 'COMP') {
          if (serie.tipo === 'warm-up' && !novoEstado[exercicioId][chave]) {
            novoEstado[exercicioId][chave] = '15';
            mudou = true;
          } else if (serie.tipo === 'feeder' && !novoEstado[exercicioId][chave]) {
            novoEstado[exercicioId][chave] = '5';
            mudou = true;
          }
        }
      });
    });

    if (mudou) {
      console.log('Inicializando repetições:', novoEstado);
      setRepeticoesFeitas(novoEstado);
    }
  }, [exercicios, series]);

  const adicionarExercicio = async () => {
    try {
      if (!novoExercicioNome.trim()) {
        throw new Error('Por favor, insira um nome para o exercício');
      }

      if (repeticoesMinimas <= 0 || repeticoesMaximas <= 0) {
        throw new Error('As repetições mínimas e máximas devem ser maiores que zero');
      }

      if (repeticoesMinimas > repeticoesMaximas) {
        throw new Error('As repetições mínimas não podem ser maiores que as máximas');
      }

      if (tipoExecucao === 'COMP' && (numeroWorkSets < 1 || numeroWorkSets > 10)) {
        throw new Error('O número de work sets deve estar entre 1 e 10');
      }

      if (tipoExecucao === 'SIMP' && (numeroSeriesSimp < 1 || numeroSeriesSimp > 10)) {
        throw new Error('O número de séries deve estar entre 1 e 10');
      }

      const exercicioId = await db.exercicios.add({
        nome: novoExercicioNome.trim(),
        treinoId: Number(params.id),
        tipo: tipoExecucao,
        tipoExecucao: tipoExecucao,
        repeticoesMinimas: Number(repeticoesMinimas),
        repeticoesMaximas: Number(repeticoesMaximas),
        ordem: (exercicios?.length || 0) + 1,
        numeroWorkSets: tipoExecucao === 'COMP' ? numeroWorkSets : numeroSeriesSimp
      });

      console.log('Exercício adicionado:', { exercicioId, tipoExecucao });

      // Criar séries baseado no tipo de exercício
      const series = [];
      if (tipoExecucao === 'COMP') {
        // Warm Up (primeira série)
        series.push({
          exercicioId,
          numero: 1,
          peso: 0,
          tipo: 'warm-up' as TipoSerie,
          repeticoes: 15,
          ordem: 1
        });

        // 2 Feeder Sets (séries 2 e 3)
        for (let i = 0; i < 2; i++) {
          series.push({
            exercicioId,
            numero: i + 2,
            peso: 0,
            tipo: 'feeder' as TipoSerie,
            repeticoes: 5,
            ordem: i + 2
          });
        }

        // Work Sets (séries 4 em diante)
        for (let i = 0; i < numeroWorkSets; i++) {
          series.push({
            exercicioId,
            numero: i + 4,
            peso: 0,
            tipo: 'work-set' as TipoSerie,
            repeticoes: 0,
            ordem: i + 4
          });
        }
      } else {
        // Para exercícios SIMP, todas as séries são work sets
        for (let i = 0; i < numeroSeriesSimp; i++) {
          series.push({
            exercicioId,
            numero: i + 1,
            peso: 0,
            tipo: 'work-set' as TipoSerie,
            repeticoes: 0,
            ordem: i + 1
          });
        }
      }

      console.log('Séries a serem adicionadas:', series);
      await db.series.bulkAdd(series);

      // Limpar estado
      setNovoExercicioNome('');
      setTipoExecucao('SIMP');
      setRepeticoesMinimas(8);
      setRepeticoesMaximas(12);
      setNumeroWorkSets(3);
      setNumeroSeriesSimp(3);
      setModalCargasOpen(false);

      alert('Exercício adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
      if (error instanceof Error) {
        alert(`Erro ao adicionar exercício: ${error.message}`);
      } else {
      alert('Erro ao adicionar exercício. Tente novamente.');
      }
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

      // Validar peso
      if (novosDados.peso !== undefined) {
        if (novosDados.peso < 0) {
          throw new Error('O peso não pode ser negativo');
        }
        if (novosDados.peso > 999) {
          throw new Error('O peso excede o limite máximo');
        }
      }

      // Validar repetições
      if (novosDados.repeticoes !== undefined) {
        if (novosDados.repeticoes < 0) {
          throw new Error('O número de repetições não pode ser negativo');
        }
        if (novosDados.repeticoes > 999) {
          throw new Error('O número de repetições excede o limite máximo');
        }
      }

      // Atualizar série em uma única transação
      await db.transaction('rw', [db.series], async () => {
      await db.series.update(serieId, novosDados);
      });

      console.log('Série atualizada com sucesso:', { serieId, novosDados });
    } catch (error) {
      console.error('Erro ao atualizar série:', error);
      if (error instanceof Error) {
        alert(`Erro ao atualizar série: ${error.message}`);
      } else {
      alert('Erro ao atualizar série. Tente novamente.');
      }
    }
  };

  const atualizarRepeticoes = (exercicioId: number, serieId: string | number, value: string) => {
    try {
      // Validar o valor
      if (value && !(/^\d+$/.test(value))) {
        console.error('Valor inválido para repetições:', value);
        return;
      }

      // Criar uma cópia do estado atual
      const novoEstado = { ...repeticoesFeitas };
      
      // Inicializar o objeto do exercício se não existir
      if (!novoEstado[exercicioId]) {
        novoEstado[exercicioId] = {};
      }
      
      // Atualizar o valor da série apenas se for um número válido
      const numeroRepeticoes = value ? parseInt(value, 10) : '';
      if (numeroRepeticoes !== '' && (isNaN(numeroRepeticoes) || numeroRepeticoes < 0)) {
        console.error('Número de repetições inválido:', value);
        return;
      }

      novoEstado[exercicioId][`serie-${serieId}`] = value;
      
      // Atualizar o estado em uma única operação
      setRepeticoesFeitas(novoEstado);
      
      console.log('Repetições atualizadas:', {
        exercicioId,
        serieId,
        value,
        novoEstado: novoEstado[exercicioId]
      });
    } catch (error) {
      console.error('Erro ao atualizar repetições:', error);
    }
  };

  const verificarRepeticoesPreenchidas = (exercicioId: number, series: Serie[]) => {
    try {
      const exercicio = exercicios?.find(e => e.id === exercicioId);
      if (!exercicio) return false;

      // Para exercícios COMP, verificar apenas as work sets
      if (exercicio.tipo === 'COMP') {
        // Filtrar apenas as work sets (séries 4, 5 e 6)
        const workSets = series
          .filter(s => s.tipo === 'work-set' && s.numero >= 4)
          .sort((a, b) => a.numero - b.numero);

        if (workSets.length === 0) {
          console.log('Nenhuma work set encontrada');
          return false;
        }

        const repeticoesExercicio = repeticoesFeitas[exercicioId] || {};
        
        const todasPreenchidas = workSets.every(serie => {
          if (!serie.id) return false;

          const repeticoesValue = repeticoesExercicio[`serie-${serie.id}`];
          const isPreenchida = repeticoesValue && repeticoesValue.trim() !== '';

          console.log(`Verificando work set ${serie.numero}:`, {
            id: serie.id,
            repeticoesValue,
            isPreenchida
          });

          return isPreenchida;
        });

        console.log('Resultado da verificação COMP:', {
          exercicioId,
          todasPreenchidas,
          workSets: workSets.map(s => ({
            numero: s.numero,
            id: s.id,
            repeticoes: repeticoesFeitas[exercicioId]?.[`serie-${s.id}`]
          }))
        });

        return todasPreenchidas;
      }

      // Para exercícios SIMP, verificar todas as séries
      const seriesParaVerificar = series.filter(s => s.tipo === 'work-set');

      if (seriesParaVerificar.length === 0) {
        console.log('Nenhuma série para verificar');
        return false;
      }

      const repeticoesExercicio = repeticoesFeitas[exercicioId] || {};
      
      const todasPreenchidas = seriesParaVerificar.every(serie => {
        if (!serie.id) return false;

        const repeticoesValue = repeticoesExercicio[`serie-${serie.id}`];
        const isPreenchida = repeticoesValue && repeticoesValue.trim() !== '';

        console.log(`Verificando série ${serie.numero}:`, {
          id: serie.id,
          tipo: serie.tipo,
          repeticoesValue,
          isPreenchida
        });

        return isPreenchida;
      });

      return todasPreenchidas;
    } catch (error) {
      console.error('Erro ao verificar repetições:', error);
      return false;
    }
  };

  const registrarExecucao = async (exercicioId: number, series: Serie[]) => {
    try {
      if (!exercicioId) {
        throw new Error('ID do exercício inválido');
      }

      // Verificar se o exercício existe
      const exercicio = await db.exercicios.get(exercicioId);
      if (!exercicio) {
        throw new Error('Exercício não encontrado');
      }

      const data = new Date();
      const historico: HistoricoExercicio[] = [];

      // Para exercícios COMP, precisamos mapear corretamente as work sets
      if (exercicio.tipo === 'COMP') {
        // Filtrar apenas as work sets (séries 4, 5 e 6)
        const workSets = series
          .filter(s => s.tipo === 'work-set' && s.numero >= 4)
          .sort((a, b) => a.numero - b.numero);

        // Verificar se todas as work sets têm repetições preenchidas
        const todasPreenchidas = workSets.every(serie => {
          if (!serie.id) return false;
          const repeticoesValue = repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`];
          return repeticoesValue && repeticoesValue.trim() !== '';
        });

        if (!todasPreenchidas) {
          throw new Error('Por favor, preencha as repetições dos work sets antes de registrar');
        }

        // Registrar cada work set mantendo a ordem correta
        workSets.forEach((serie) => {
          if (!serie.id) return;

          const repeticoesValue = repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`];
          if (repeticoesValue && repeticoesValue.trim() !== '') {
            const repeticoes = Number(repeticoesValue);
            
            if (repeticoes > 0) {
              historico.push({
                id: Date.now() + Math.random(),
        exercicioId,
        data,
                peso: serie.peso || 0,
                repeticoes,
                observacoes: observacoes[exercicioId] || '',
                tipo: 'work-set',
                ordem: serie.numero - 3 // Converte série 4, 5, 6 para 1, 2, 3
              });
            }
          }
        });

        if (historico.length === 0) {
          throw new Error('Nenhuma repetição válida para registrar');
        }

        // Registrar o histórico em uma única transação
        await db.transaction('rw', [db.historico], async () => {
      await db.historico.bulkAdd(historico);
        });

        // Atualizar estados após sucesso
      setHistorico(prev => [...prev, ...historico]);
      
        // Atualizar histórico da semana anterior
        const novoHistoricoSemanaAnterior = { ...historicoSemanaAnterior };
        if (!novoHistoricoSemanaAnterior[exercicioId]) {
          novoHistoricoSemanaAnterior[exercicioId] = {};
        }

        historico.forEach(registro => {
          novoHistoricoSemanaAnterior[exercicioId][registro.ordem] = {
            repeticoes: registro.repeticoes,
            peso: registro.peso
          };
        });
        
        setHistoricoSemanaAnterior(novoHistoricoSemanaAnterior);
        
        // Limpar estados
      setRepeticoesFeitas(prev => {
          const novo = { ...prev };
          delete novo[exercicioId];
          return novo;
      });
      
      setObservacoes(prev => {
          const novo = { ...prev };
          delete novo[exercicioId];
          return novo;
        });

        alert('Execução registrada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao registrar execução:', error);
      if (error instanceof Error) {
        alert(`Erro ao registrar execução: ${error.message}`);
      } else {
      alert('Erro ao registrar execução. Tente novamente.');
      }
    }
  };

  const adicionarSerie = async (exercicioId: number, numeroAtual: number) => {
    try {
      if (!exercicioId) {
        throw new Error('ID do exercício inválido');
      }

      if (numeroAtual >= 10) {
        throw new Error('Número máximo de séries atingido');
      }

      const novaSerie: Serie = {
        id: Date.now(),
        exercicioId,
        tipo: 'work-set' as TipoSerie,
        numero: numeroAtual + 1,
        repeticoes: 0,
        peso: series?.find(s => s.exercicioId === exercicioId)?.peso || 0
      };

      console.log('Adicionando nova série:', novaSerie);
      await db.series.add(novaSerie);
    } catch (error) {
      console.error('Erro ao adicionar série:', error);
      if (error instanceof Error) {
        alert(`Erro ao adicionar série: ${error.message}`);
      } else {
        alert('Erro ao adicionar série. Tente novamente.');
      }
    }
  };

  const removerUltimaSerie = async (exercicioId: number) => {
    try {
      const seriesDoExercicio = series?.filter(s => s.exercicioId === exercicioId) || [];
      if (seriesDoExercicio.length <= 1) {
        throw new Error('Não é possível remover todas as séries');
      }
      
      const ultimaSerie = seriesDoExercicio[seriesDoExercicio.length - 1];
      if (!ultimaSerie?.id) {
        throw new Error('Série inválida');
      }

      console.log('Removendo série:', ultimaSerie);
      await db.series.delete(ultimaSerie.id);
    } catch (error) {
      console.error('Erro ao remover série:', error);
      if (error instanceof Error) {
        alert(`Erro ao remover série: ${error.message}`);
      } else {
        alert('Erro ao remover série. Tente novamente.');
      }
    }
  };

  const editarExercicio = async () => {
    try {
      if (!exercicioParaEditar?.id) {
        throw new Error('Exercício inválido');
      }

      if (!editarExercicioNome.trim()) {
        throw new Error('Por favor, insira um nome para o exercício');
      }

      if (editarRepeticoesMinimas <= 0 || editarRepeticoesMaximas <= 0) {
        throw new Error('As repetições mínimas e máximas devem ser maiores que zero');
      }

      if (editarRepeticoesMinimas > editarRepeticoesMaximas) {
        throw new Error('As repetições mínimas não podem ser maiores que as máximas');
      }

      await db.exercicios.update(exercicioParaEditar.id, {
        nome: editarExercicioNome.trim(),
        repeticoesMinimas: editarRepeticoesMinimas,
        repeticoesMaximas: editarRepeticoesMaximas
      });

      setModalEditarExercicioOpen(false);
      setExercicioParaEditar(null);
      setEditarExercicioNome('');
      setEditarRepeticoesMinimas(8);
      setEditarRepeticoesMaximas(12);

      alert('Exercício atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao editar exercício:', error);
      if (error instanceof Error) {
        alert(`Erro ao editar exercício: ${error.message}`);
      } else {
        alert('Erro ao editar exercício. Tente novamente.');
      }
    }
  };

  const ModalEditarExercicio = ({ exercicio, onClose }: { exercicio: Exercicio; onClose: () => void }) => {
    useEffect(() => {
      setEditarExercicioNome(exercicio.nome);
      setEditarRepeticoesMinimas(exercicio.repeticoesMinimas);
      setEditarRepeticoesMaximas(exercicio.repeticoesMaximas);
    }, [exercicio]);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Editar Exercício</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Exercício</label>
              <input
                type="text"
                value={editarExercicioNome}
                onChange={(e) => setEditarExercicioNome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repetições Mínimas</label>
                <input
                  type="number"
                  value={editarRepeticoesMinimas}
                  onChange={(e) => setEditarRepeticoesMinimas(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repetições Máximas</label>
                <input
                  type="number"
                  value={editarRepeticoesMaximas}
                  onChange={(e) => setEditarRepeticoesMaximas(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              onClick={editarExercicio}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
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
    <main className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
        <Link href="/" className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{treino.nome}</h1>
          <p className="text-sm text-gray-600">{treino.diaDaSemana !== undefined ? diasDaSemana[treino.diaDaSemana] : ''}</p>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">Adicionar Exercício</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
              Nome do Exercício
            </label>
            <input
              type="text"
              value={novoExercicioNome}
              onChange={(e) => setNovoExercicioNome(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
              placeholder="Ex: Supino Reto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
              Tipo de Execução
            </label>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setTipoExecucao('SIMP')}
                className={`px-6 py-2 rounded-lg border transition-colors ${
                  tipoExecucao === 'SIMP'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-blue-200'
                }`}
              >
                Simples
              </button>
              <button
                onClick={() => setTipoExecucao('COMP')}
                className={`px-6 py-2 rounded-lg border transition-colors ${
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
              <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Repetições Mínimas
              </label>
              <input
                type="number"
                value={repeticoesMinimas}
                onChange={(e) => setRepeticoesMinimas(Number(e.target.value))}
                className="w-24 px-2 py-1.5 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Repetições Máximas
              </label>
              <input
                type="number"
                value={repeticoesMaximas}
                onChange={(e) => setRepeticoesMaximas(Number(e.target.value))}
                className="w-24 px-2 py-1.5 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                min="1"
                max="100"
              />
            </div>
          </div>

          {tipoExecucao === 'COMP' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Número de Work Sets
              </label>
              <input
                type="number"
                value={numeroWorkSets}
                onChange={(e) => setNumeroWorkSets(Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-center mx-auto block border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                min="1"
                max="10"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                Número de Séries
              </label>
              <input
                type="number"
                value={numeroSeriesSimp}
                onChange={(e) => setNumeroSeriesSimp(Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-center mx-auto block border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                min="1"
                max="10"
              />
            </div>
          )}

          <button
            onClick={adicionarExercicio}
            className="w-full max-w-[200px] mx-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center space-x-2"
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
          const repeticoesPreenchidas = verificarRepeticoesPreenchidas(exercicioId, seriesDoExercicio);
          
          return (
            <div
              key={exercicioId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                    <button
                      onClick={() => excluirExercicio(exercicioId)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="Excluir Exercício"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setExercicioParaEditar(exercicio);
                        setModalEditarExercicioOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                      title="Editar Exercício"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                        </div>
                  <h2 className="text-xl font-bold text-gray-900 text-center flex-1">{exercicio.nome}</h2>
                  <Link
                    href={`/exercicio/${exercicioId}`}
                    className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                    title="Ver Histórico Completo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Link>
                      </div>

                {/* Informações de Carga e Meta */}
                <div className="flex items-center justify-between w-full max-w-xl px-4 mb-4">
                      <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-gray-600 mb-2">Carga Work Sets</label>
                    <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                        value={seriesDoExercicio.find(s => s.tipo === 'work-set')?.peso || ''}
                                onChange={(e) => {
                                  const novoPeso = Number(e.target.value);
                          seriesDoExercicio.forEach(serie => {
                            if (serie.id && serie.tipo === 'work-set') {
                                        atualizarSerie(serie.id, { peso: novoPeso });
                                      }
                                    });
                                }}
                        onBlur={(e) => {
                          e.target.scrollIntoView(false);
                          window.scrollTo(0, window.scrollY);
                        }}
                        inputMode="decimal"
                        className="w-16 px-2 py-1.5 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="0"
                              />
                      <button
                        onClick={() => {
                          const pesoAtual = seriesDoExercicio.find(s => s.tipo === 'work-set')?.peso || 0;
                          const novoPeso = pesoAtual + 2.5;
                          seriesDoExercicio.forEach(serie => {
                            if (serie.id && serie.tipo === 'work-set') {
                                        atualizarSerie(serie.id, { peso: novoPeso });
                                      }
                                    });
                                }}
                        className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors border border-blue-200"
                        title="Aumentar 2.5kg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600">kg</span>
                            </div>
                          </div>

                    <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-gray-600 mb-2">Meta</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 px-3 py-1.5 bg-gray-100 rounded-lg whitespace-nowrap">
                        {exercicio.repeticoesMinimas}-{exercicio.repeticoesMaximas} reps
                      </span>
                      {exercicio.tipo === 'SIMP' && (
                        <div className="flex items-center space-x-1">
                      <button
                            onClick={() => removerUltimaSerie(exercicioId)}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors border border-blue-200"
                            title="Remover série"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                      </button>
                      <button
                            onClick={() => adicionarSerie(exercicioId, seriesDoExercicio.length)}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors border border-blue-200"
                            title="Adicionar série"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                    <div className="space-y-3">
                  {seriesDoExercicio.slice(0, exercicio.tipo === 'COMP' ? 6 : undefined).map((serie) => {
                    let nomeSerie = '';
                    if (exercicio.tipo === 'COMP') {
                      if (serie.numero === 1) {
                        nomeSerie = 'Warm Up';
                      } else if (serie.numero === 2 || serie.numero === 3) {
                        nomeSerie = `Feeder ${serie.numero - 1}`;
                      } else if (serie.numero <= 6) {
                        nomeSerie = `Work Set ${serie.numero - 3}`;
                      }
                    } else {
                      nomeSerie = `Work Set ${serie.numero}`;
                    }

                    return (
                        <div
                          key={serie.id}
                        className="bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors p-4"
                      >
                        <div className="flex flex-col space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-medium text-gray-700">{nomeSerie}</h3>
                            <div className="flex items-center">
                              <span className="text-sm text-gray-500">Meta: </span>
                              <span className="text-sm font-medium text-gray-700 ml-1">
                                {exercicio.tipo === 'COMP' ? (
                                  serie.numero === 1 ? '15 reps' :
                                  (serie.numero === 2 || serie.numero === 3) ? '5 reps' :
                                  `${exercicio.repeticoesMinimas}-${exercicio.repeticoesMaximas} reps`
                                ) : (
                                  `${exercicio.repeticoesMinimas}-${exercicio.repeticoesMaximas} reps`
                                )}
                                  </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="w-24 text-center"></th>
                                  <th className="px-3 py-1.5 text-center">
                                    <span className="text-sm text-gray-600">Antes</span>
                                  </th>
                                  <th className="px-3 py-1.5 text-center">
                                    <span className="text-sm text-gray-600">Hoje</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="px-2 py-2 text-sm text-gray-600 font-medium text-center">Carga</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="text-sm text-blue-600">
                                      {historicoSemanaAnterior[exercicioId]?.[serie.numero]?.peso || '-'} kg
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {serie.tipo === 'work-set' ? (
                                      <span className="text-sm text-gray-600">
                                        {serie.peso || '0'} kg
                                      </span>
                                    ) : (
                                <input
                                  type="number"
                                  min="0"
                                        step="0.5"
                                        value={serie.peso || ''}
                                  onChange={(e) => {
                                          if (serie.id) {
                                            atualizarSerie(serie.id, { peso: Number(e.target.value) });
                                          }
                                        }}
                                        onBlur={(e) => {
                                          e.target.scrollIntoView(false);
                                          window.scrollTo(0, window.scrollY);
                                        }}
                                        inputMode="decimal"
                                        className="w-16 px-2 py-1.5 text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                  placeholder="0"
                                />
                                    )}
                                  </td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td className="px-2 py-2 text-sm text-gray-600 font-medium text-center">Reps</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="text-sm text-blue-600">
                                      {historicoSemanaAnterior[exercicioId]?.[serie.numero]?.repeticoes || '-'}
                                  </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {exercicio.tipo === 'COMP' && (serie.tipo === 'warm-up' || serie.tipo === 'feeder') ? (
                              <span className="text-sm text-gray-600">
                                        {serie.tipo === 'warm-up' ? '15' : '5'}
                              </span>
                                    ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`] || ''}
                                    onChange={(e) => {
                                      atualizarRepeticoes(exercicioId, serie.id!, e.target.value);
                                    }}
                                    onBlur={(e) => {
                                      e.target.scrollIntoView(false);
                                      window.scrollTo(0, window.scrollY);
                                    }}
                                    inputMode="numeric"
                                    className="w-16 px-2 py-1.5 text-center mx-auto border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="0"
                                  />
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                                </div>
                              </div>
                          </div>
                    );
                  })}
                            </div>

                <div className="mt-6 flex flex-col items-center space-y-2">
                          <button
                    onClick={() => registrarExecucao(exercicioId, seriesDoExercicio)}
                    disabled={!repeticoesPreenchidas}
                    className={`${
                      repeticoesPreenchidas 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-400 cursor-not-allowed'
                    } text-white font-medium py-2 px-6 rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Registrar Execução</span>
                          </button>
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

      {/* Modal de edição de exercício */}
      {modalEditarExercicioOpen && exercicioParaEditar && (
        <ModalEditarExercicio
          exercicio={exercicioParaEditar}
          onClose={() => {
            setModalEditarExercicioOpen(false);
            setExercicioParaEditar(null);
          }}
        />
      )}
    </main>
  );
} 