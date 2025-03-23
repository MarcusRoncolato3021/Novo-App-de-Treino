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
  const [repeticoesFeitas, setRepeticoesFeitas] = useState<{[key: number]: number}>({});
  const [peso, setPeso] = useState(0);
  const [repeticoes, setRepeticoes] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  const exercicio = useLiveQuery(
    () => db.exercicios.get(exercicioId),
    [exercicioId]
  );

  const series = useLiveQuery(
    () => db.series
      .where('exercicioId')
      .equals(exercicioId)
      .toArray()
      .then(series => {
        if (series.length > 0 && exercicio?.tipo === 'COMP') {
          // Primeiro, vamos ordenar por número
          series.sort((a, b) => a.numero - b.numero);

          // Agora vamos atualizar os tipos corretamente
          return series.map((serie, index) => {
            let tipo: TipoSerie;
            let numero = index + 1;

            if (index === 0) {
              tipo = 'warm-up';
            } else if (index === 1 || index === 2) {
              tipo = 'feeder';
            } else {
              tipo = 'work-set';
            }

            return {
              ...serie,
              tipo,
              numero
            };
          });
        }
        return series;
      }),
    [exercicioId, exercicio?.tipo]
  );

  const historico = useLiveQuery(
    () => db.historico
      .where('exercicioId')
      .equals(exercicioId)
      .reverse()
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

  const verificarRepeticoesPreenchidas = () => {
    if (!exercicio || !series) return false;

    if (exercicio.tipo === 'COMP') {
      // Pega apenas as últimas 3 séries (work sets)
      const workSets = series.slice(-3);
      
      console.log('Work sets encontradas:', workSets.map(s => ({
        numero: s.numero,
        tipo: s.tipo,
        id: s.id
      })));
      
      // Verifica se pelo menos uma work set tem repetições
      const temRepeticoes = workSets.some(serie => {
        if (!serie.id) return false;
        const reps = repeticoesFeitas[serie.id];
        console.log(`Work Set ${serie.numero - 3}:`, {
          id: serie.id,
          repeticoes: reps,
          estado: repeticoesFeitas
        });
        return reps > 0;
      });

      console.log('Estado final:', {
        temRepeticoes,
        repeticoesFeitas,
        workSets: workSets.map(s => s.numero)
      });
      return temRepeticoes;
    }

    // Para exercícios SIMP
    const primeiraSerie = series[0];
    return primeiraSerie?.id ? repeticoesFeitas[primeiraSerie.id] > 0 : false;
  };

  const registrarExecucao = async () => {
    if (!exercicio?.id || !series) {
      console.log('Exercício ou séries não encontrados');
      return;
    }

    try {
      const data = new Date();
      const historicos: HistoricoExercicio[] = [];

      if (exercicio.tipo === 'COMP') {
        // Pega as últimas 3 séries (work sets)
        const workSets = series.slice(-3);

        console.log('Work sets para registro:', workSets.map(s => ({
          numero: s.numero,
          tipo: s.tipo,
          id: s.id
        })));

        workSets.forEach((serie, index) => {
          if (!serie.id) return;
          
          const repeticoes = repeticoesFeitas[serie.id];
          if (repeticoes && repeticoes > 0) {
            const historico: HistoricoExercicio = {
              id: Date.now() + index,
              exercicioId: exercicioId,
              data: data,
              peso: serie.peso || 0,
              repeticoes: repeticoes,
              observacoes: observacoes,
              tipo: 'work-set' as TipoSerie,
              ordem: index + 1 // Work sets serão 1, 2, 3
            };
            
            console.log('Adicionando histórico:', historico);
            historicos.push(historico);
          }
        });
      } else {
        // Para exercícios SIMP
        const serie = series[0];
        if (serie?.id && repeticoesFeitas[serie.id] > 0) {
          historicos.push({
            id: Date.now(),
            exercicioId: exercicioId,
            data: data,
            peso: serie.peso || 0,
            repeticoes: repeticoesFeitas[serie.id],
            observacoes: observacoes,
            tipo: 'work-set' as TipoSerie,
            ordem: 1
          });
        }
      }

      if (historicos.length === 0) {
        console.log('Nenhum histórico para registrar');
        alert('Por favor, preencha as repetições de pelo menos uma série de trabalho.');
        return;
      }

      console.log('Registrando históricos:', historicos);
      await db.historico.bulkAdd(historicos);

      setRepeticoesFeitas({});
      setObservacoes('');

      alert('Execução registrada com sucesso!');
      router.refresh();

    } catch (error) {
      console.error('Erro ao registrar execução:', error);
      alert('Erro ao registrar execução');
    }
  };

  const limparHistorico = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o histórico deste exercício? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await db.historico
        .where('exercicioId')
        .equals(exercicioId)
        .delete();
      alert('Histórico limpo com sucesso!');
      router.refresh();
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      alert('Erro ao limpar histórico. Tente novamente.');
    }
  };

  // Função para agrupar registros por data
  const agruparPorData = (registros: HistoricoExercicio[]) => {
    const grupos: { [key: string]: HistoricoExercicio[] } = {};
    registros.forEach(registro => {
      const data = new Date(registro.data);
      const dataFormatada = data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      if (!grupos[dataFormatada]) {
        grupos[dataFormatada] = [];
      }
      grupos[dataFormatada].push(registro);
    });
    return grupos;
  };

  const renderSerie = (serie: Serie) => {
    let nomeSerie = '';
    let repeticoesFixas = null;
    
    if (exercicio?.tipo === 'COMP') {
      if (serie.tipo === 'warm-up') {
        nomeSerie = 'Warm Up';
        repeticoesFixas = 15;
      } else if (serie.tipo === 'feeder') {
        const feederNumero = serie.numero - 1; // Ajusta para mostrar 1 e 2
        nomeSerie = `Feeder Set ${feederNumero}`;
        repeticoesFixas = 5;
      } else if (serie.tipo === 'work-set') {
        const workSetNumero = serie.numero - 3; // Ajusta para mostrar 1, 2 e 3
        nomeSerie = `Work Set ${workSetNumero}`;
      }
    } else {
      nomeSerie = `Work Set ${serie.numero}`;
    }

    // Adiciona indicador visual para work sets
    const isWorkSet = serie.tipo === 'work-set';
    const serieClass = isWorkSet ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200';

    return (
      <div key={serie.id} className={`rounded-lg p-4 shadow-sm border ${serieClass}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-800">
              {nomeSerie}
              {isWorkSet && <span className="ml-2 text-sm text-blue-600">(Registrar)</span>}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {repeticoesFixas ? `${repeticoesFixas} reps` :
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

          {(!repeticoesFixas && exercicio && (serie.tipo === 'work-set' || exercicio.tipo === 'SIMP')) && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Repetições {isWorkSet && <span className="text-blue-600">*</span>}
              </label>
              <input
                type="number"
                value={serie.id ? repeticoesFeitas[serie.id] || '' : ''}
                onChange={(e) => {
                  if (serie.id) {
                    const valor = Math.max(0, parseInt(e.target.value) || 0);
                    setRepeticoesFeitas(prev => {
                      const novo = { ...prev, [serie.id!]: valor };
                      console.log('Atualizando repetições:', {
                        serie: serie.numero,
                        tipo: serie.tipo,
                        valor,
                        estado: novo
                      });
                      return novo;
                    });
                  }
                }}
                className={`w-full px-3 py-2 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isWorkSet ? 'border-blue-300 bg-white' : 'border-gray-300'
                }`}
                min="0"
                placeholder={`${exercicio.repeticoesMinimas}-${exercicio.repeticoesMaximas}`}
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
              {series.slice(0, exercicio.tipo === 'COMP' ? 6 : undefined).map(renderSerie)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
              placeholder="Registre aqui suas observações sobre o treino..."
            />
          </div>

          <div>
            {exercicio.tipo === 'COMP' && (
              <p className="text-sm text-gray-600 mb-2">
                * Preencha as repetições de pelo menos uma Work Set para registrar a execução
              </p>
            )}
            <button
              onClick={registrarExecucao}
              disabled={!verificarRepeticoesPreenchidas()}
              className={`w-full py-2 px-4 rounded-lg transition-colors ${
                verificarRepeticoesPreenchidas()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Registrar Execução
            </button>
          </div>
        </div>

        {historico && historico.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Histórico</h2>
              <button
                onClick={limparHistorico}
                className="text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <span>Limpar Histórico</span>
              </button>
            </div>
            <div className="space-y-6">
              {Object.entries(agruparPorData(historico)).map(([data, registros]) => (
                <div key={data} className="space-y-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-sm font-medium text-gray-500 px-2">{data}</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>
                  <div className="space-y-2">
                    {registros.map((registro, index) => (
                      <div key={registro.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">
                              Work Set {registro.ordem}
                            </span>
                            <span className="font-medium text-gray-800">
                              {registro.repeticoes} reps × {registro.peso}kg
                            </span>
                          </div>
                          {registro.observacoes && (
                            <p className="text-sm text-gray-600 max-w-[50%] text-right">{registro.observacoes}</p>
                          )}
                        </div>
                      </div>
                    ))}
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