'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, Exercicio, Serie, TipoExecucao, TipoSerie, isDatabaseReady } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import type { HistoricoExercicio } from '@/lib/db';
import { toast } from 'react-hot-toast';

const diasDaSemana = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

type Cargas = Record<number, number>;

export default function TreinoPage() {
  const params = useParams();
  const router = useRouter();
  const treinoId = Number(params.id);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
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
  const [cargas, setCargas] = useState<Cargas>({});
  const [historico, setHistorico] = useState<HistoricoExercicio[]>([]);
  const [modalEditarExercicioOpen, setModalEditarExercicioOpen] = useState(false);
  const [exercicioParaEditar, setExercicioParaEditar] = useState<Exercicio | null>(null);
  const [editarExercicioNome, setEditarExercicioNome] = useState('');
  const [editarRepeticoesMinimas, setEditarRepeticoesMinimas] = useState(8);
  const [editarRepeticoesMaximas, setEditarRepeticoesMaximas] = useState(12);

  // Verificar estado do banco de dados
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const ready = await isDatabaseReady();
        if (!ready) {
          setDbError('Erro ao conectar ao banco de dados. Tente recarregar a página.');
        }
      } catch (error) {
        setDbError('Erro inesperado ao verificar o banco de dados.');
      } finally {
        setIsLoading(false);
      }
    };

    checkDatabase();
  }, []);

  const treino = useLiveQuery(
    async () => {
      try {
        return await db.treinos.get(treinoId);
      } catch (error) {
        console.error('Erro ao buscar treino:', error);
        return null;
      }
    },
    [treinoId]
  );

  const exercicios = useLiveQuery(
    async () => {
      try {
        return await db.exercicios
          .where('treinoId')
          .equals(treinoId)
          .sortBy('ordem');
      } catch (error) {
        console.error('Erro ao buscar exercícios:', error);
        return [];
      }
    },
    [treinoId]
  );

  const series = useLiveQuery(
    async () => {
      try {
        if (!exercicios?.length) return [];
        return await db.series
          .where('exercicioId')
          .anyOf(exercicios.map(e => e.id!))
          .sortBy('ordem');
      } catch (error) {
        console.error('Erro ao buscar séries:', error);
        return [];
      }
    },
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

      const exercicio = await db.exercicios.get(exercicioId);
      if (!exercicio) {
        throw new Error('Exercício não encontrado');
      }

      const data = new Date();
      const historico: HistoricoExercicio[] = [];

      // Processar séries baseado no tipo do exercício
      if (exercicio.tipo === 'COMP') {
        // Organizar séries por tipo
        const seriesOrdenadas = series.sort((a, b) => {
          const tipoOrdem = { 'warm-up': 1, 'feeder': 2, 'work-set': 3 };
          if (a.tipo !== b.tipo) {
            return tipoOrdem[a.tipo] - tipoOrdem[b.tipo];
          }
          return a.numero - b.numero;
        });

        // Registrar cada série na ordem correta
        for (const serie of seriesOrdenadas) {
          if (!serie.id) continue;
          
          // Para warm-up e feeder, usar os valores padrão
          const repeticoes = serie.tipo === 'warm-up' ? 15 : 
                            serie.tipo === 'feeder' ? 5 :
                            Number(repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`]) || 0;

          historico.push({
            exercicioId,
            data,
            tipo: serie.tipo,
            numero: serie.numero,
            repeticoes,
            peso: serie.peso,
            ordem: serie.ordem
          });
        }
      } else {
        // Para exercícios SIMP, registrar todas as séries
        for (const serie of series) {
          if (!serie.id) continue;

          const repeticoes = Number(repeticoesFeitas[exercicioId]?.[`serie-${serie.id}`]) || 0;

          historico.push({
            exercicioId,
            data,
            tipo: 'work-set',
            numero: serie.numero,
            repeticoes,
            peso: serie.peso,
            ordem: serie.ordem
          });
        }
      }

      // Salvar histórico
      await db.historico.bulkAdd(historico);
      
      // Limpar as repetições registradas
      setRepeticoesFeitas(prev => {
        const novo = { ...prev };
        delete novo[exercicioId];
        return novo;
      });
      
      // Atualizar a interface
      router.refresh();
      
      // Mostrar mensagem de sucesso
      toast.success('Execução registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar execução:', error);
      toast.error('Erro ao registrar execução');
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
        peso: series?.find(s => s.exercicioId === exercicioId)?.peso || 0,
        ordem: numeroAtual + 1
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

  const EditarCargasModal = ({ 
    exercicio, 
    onClose, 
    cargas, 
    setCargas 
  }: { 
    exercicio: Exercicio; 
    onClose: () => void;
    cargas: Cargas;
    setCargas: React.Dispatch<React.SetStateAction<Cargas>>;
  }) => {
    const seriesExercicio = series?.filter(s => s.exercicioId === exercicio.id) || [];
    const warmUp = seriesExercicio.find(s => s.tipo === 'warm-up');
    const feeders = seriesExercicio.filter(s => s.tipo === 'feeder');
    const workSet = seriesExercicio.find(s => s.tipo === 'work-set');

    const atualizarCarga = (id: number | undefined, valor: number) => {
      if (id !== undefined) {
        setCargas(prev => ({ ...prev, [id]: valor }));
      }
    };

    const salvarCargas = async () => {
      try {
        if (warmUp?.id && cargas[warmUp.id]) {
          await atualizarSerie(warmUp.id, { peso: cargas[warmUp.id] });
        }

        for (const feeder of feeders) {
          if (feeder.id && cargas[feeder.id]) {
            await atualizarSerie(feeder.id, { peso: cargas[feeder.id] });
          }
        }

        if (workSet?.id && cargas[workSet.id]) {
          await atualizarSerie(workSet.id, { peso: cargas[workSet.id] });
        }

        onClose();
        setCargas({});
        toast.success('Cargas atualizadas com sucesso!');
      } catch (error) {
        console.error('Erro ao salvar cargas:', error);
        toast.error('Erro ao salvar as cargas. Tente novamente.');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Editar Cargas</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {warmUp?.id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carga Warm Up</label>
                <input
                  type="number"
                  value={cargas[warmUp.id] || ''}
                  onChange={(e) => warmUp.id && atualizarCarga(warmUp.id, Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.5"
                />
              </div>
            )}

            {feeders.map((feeder, index) => (
              feeder.id && (
                <div key={feeder.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carga Feeder {index + 1}</label>
                  <input
                    type="number"
                    value={cargas[feeder.id] || ''}
                    onChange={(e) => feeder.id && atualizarCarga(feeder.id, Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.5"
                  />
                </div>
              )
            ))}

            {workSet?.id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carga Work Set</label>
                <input
                  type="number"
                  value={cargas[workSet.id] || ''}
                  onChange={(e) => workSet.id && atualizarCarga(workSet.id, Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.5"
                />
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Rest of the component content */}
      {exercicios?.map((exercicio) => (
        <div key={exercicio.id}>
          <div className="flex justify-between items-center">
            <h3>{exercicio.nome}</h3>
            <button
              onClick={() => {
                setExercicioSelecionado(exercicio);
                setModalCargasOpen(true);
              }}
              className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Editar Cargas
            </button>
          </div>
          {/* Rest of the exercise content */}
        </div>
      ))}
      {modalCargasOpen && exercicioSelecionado && (
        <EditarCargasModal
          exercicio={exercicioSelecionado}
          onClose={() => {
            setModalCargasOpen(false);
            setExercicioSelecionado(null);
          }}
          cargas={cargas}
          setCargas={setCargas}
        />
      )}
    </div>
  );
}