'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, TipoSerie, TipoExecucao } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface HistoricoRegistro {
  id?: number;
  exercicioId: number;
  data: Date;
  repeticoes: number;
  peso: number;
  tipo: TipoSerie;
  ordem: number;
  observacoes?: string;
}

interface HistoricoMap {
  [key: number]: HistoricoRegistro[];
}

export default function TreinoPage() {
  const params = useParams();
  const router = useRouter();
  const treinoId = params?.id ? Number(params.id) : 0;
  const [expandedExercicios, setExpandedExercicios] = useState<{[key: number]: boolean}>({});
  const [showHelp, setShowHelp] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState('');

  // Carregar o estado dos exercícios expandidos do localStorage
  useEffect(() => {
    if (treinoId) {
      try {
        const savedState = localStorage.getItem(`expandedExercicios_${treinoId}`);
        if (savedState) {
          setExpandedExercicios(JSON.parse(savedState));
        }
      } catch (error) {
        console.error('Erro ao carregar estado de exercícios expandidos:', error);
      }
    }
  }, [treinoId]);

  const treino = useLiveQuery(
    () => db.treinos.get(treinoId),
    [treinoId]
  );

  // Atualizar o nome sempre que o treino mudar
  useEffect(() => {
    if (treino?.nome) {
      setNovoNome(treino.nome);
    }
  }, [treino]);

  const exercicios = useLiveQuery(
    () => db.exercicios
      .where('treinoId')
      .equals(treinoId)
      .toArray()
  );

  const historicoExercicios = useLiveQuery(
    () => {
      if (!exercicios?.length) return {} as HistoricoMap;
      
      const historico: HistoricoMap = {};
      
      return Promise.all(
        exercicios.map(exercicio => 
          db.historico
          .where('exercicioId')
            .equals(exercicio.id!)
            .toArray()
            .then(registros => {
              historico[exercicio.id!] = registros;
            })
        )
      ).then(() => historico);
    },
    [exercicios]
  );

  const toggleExercicio = (exercicioId: number) => {
    setExpandedExercicios(prev => {
      const newState = {
        ...prev,
        [exercicioId]: !prev[exercicioId]
      };
      
      // Salvar o estado atualizado no localStorage
      try {
        localStorage.setItem(`expandedExercicios_${treinoId}`, JSON.stringify(newState));
      } catch (error) {
        console.error('Erro ao salvar estado de exercícios expandidos:', error);
      }
      
      return newState;
    });
  };

  const handleDeleteExercicio = async (exercicioId: number) => {
    try {
      await db.exercicios.delete(exercicioId);
      toast.success('Exercício removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover exercício:', error);
      toast.error('Erro ao remover exercício');
    }
  };

  const handleSaveNome = async () => {
    if (!novoNome.trim()) {
      toast.error('O nome do treino não pode ficar vazio');
      return;
    }

    try {
      await db.treinos.update(treinoId, { nome: novoNome.trim() });
      setEditandoNome(false);
      toast.success('Nome do treino atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar nome do treino:', error);
      toast.error('Erro ao atualizar o nome do treino');
    }
  };

  const getTituloSerie = (tipo: TipoSerie, ordem: number): string => {
    switch (tipo) {
      case 'warm-up':
        return 'Warm up';
      case 'feeder':
        return `Feeder ${ordem}`;
      case 'work-set':
        return `Work ${ordem}`;
      default:
        return `Série ${ordem}`;
    }
  };

  const diasDaSemana = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  const abrirModal = () => {
    setModalAberto(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-8 pb-6 px-6 bg-white backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center max-w-5xl mx-auto">
          <div className="absolute left-0">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
          </div>

          {editandoNome ? (
            <div className="flex flex-col items-center space-y-2 max-w-[70%]">
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-xl font-bold text-center bg-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveNome();
                  } else if (e.key === 'Escape') {
                    setEditandoNome(false);
                    setNovoNome(treino?.nome || '');
                  }
                }}
              />
              <div className="flex space-x-4">
                <button
                  onClick={handleSaveNome}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center"
                  title="Salvar nome"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setEditandoNome(false);
                    setNovoNome(treino?.nome || '');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center"
                  title="Cancelar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center group max-w-[70%]">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 truncate">
                {treino?.nome || 'Carregando...'}
              </h1>
              <button
                onClick={() => setEditandoNome(true)}
                className="ml-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar nome"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>
          )}

          <div className="absolute right-0">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 text-base">{treino?.diaDaSemana !== undefined ? diasDaSemana[treino.diaDaSemana] : ''}</p>
          </div>

          <div className="space-y-3">
            {exercicios?.map((exercicio) => (
              <div
                key={exercicio.id}
                className="block bg-gray-50 rounded-xl p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <Link
                    href={`/exercicio/${exercicio.id}`}
                    className="flex-1"
                  >
                    <h3 className="text-base font-medium text-gray-800">
                      {exercicio.nome} - {exercicio.tipoExecucao === 'SIMP' ? 'Simp' : 'Comp'}
                    </h3>
                  </Link>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => exercicio.id && toggleExercicio(exercicio.id)}
                      className="text-gray-400 p-1 hover:text-gray-500"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth={2} 
                        stroke="currentColor" 
                        className={`w-5 h-5 transform transition-transform ${exercicio.id && expandedExercicios[exercicio.id] ? 'rotate-90' : ''}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => exercicio.id && handleDeleteExercicio(exercicio.id)}
                      className="text-red-400 p-1 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                {exercicio.id && expandedExercicios[exercicio.id] && (
                  historicoExercicios && historicoExercicios[exercicio.id]?.length > 0 ? (
                    <div className="text-sm text-gray-600 space-y-1">
                      {historicoExercicios[exercicio.id]
                        .filter((registro: HistoricoRegistro) => registro.tipo === 'work-set')
                        .sort((a: HistoricoRegistro, b: HistoricoRegistro) => a.ordem - b.ordem)
                        .map((registro: HistoricoRegistro, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="font-medium">{getTituloSerie(registro.tipo, registro.ordem)}:</span>
                            <span>{registro.peso}kg</span>
                            <span>×</span>
                            <span>{registro.repeticoes} reps</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma série registrada</p>
                  )
                )}
              </div>
            ))}
          </div>

          <Link
            href={`/treino/${treinoId}/adicionar`}
            className="w-full mt-6 py-3 px-6 bg-primary-600 text-white text-base font-medium rounded-xl hover:bg-primary-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Adicionar Exercício</span>
          </Link>
        </div>
      </main>

      {/* Modal de Ajuda */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative my-8">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
               
            <h2 className="text-xl font-bold text-gray-900 mb-4">Regras de Execução</h2>
               
            <div className="space-y-6 text-gray-600">
              <p>
                Será utilizado duas formas de execução dos exercícios, a forma "COMPLEXA" (COMP) e a forma "SIMPLIFICADA" (SIMP)
              </p>

              <div>
                <p className="font-medium mb-3">
                  Exercícios marcados em COMP fazer 1 warm up, 2 feeders e 3 work set:
                </p>
                   
                <div className="space-y-4 pl-4">
                  <div>
                    <p className="font-medium text-gray-800">Warm up</p>
                    <p>Peso para 20 repetições, fazer por volta de 15 repetições, descansa 30s após ele.</p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-800">Feeders</p>
                    <p>Peso para 10~12 repetições, fazer só 5 repetições, descansa 1 minuto após cada Feeder Set.</p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-800">Work set</p>
                    <p>Peso para falhar entre 8 e 10 repetições, descansa 2 minutos após cada Work Set</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3">
                  Exercícios marcados em SIMP fazer 3 séries convencionais, com 2 minutos de descanso entre elas, com peso para falhar entre 8 a 10 repetições.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800 font-medium">Observação importante:</p>
                <p>
                  Tanto nas Work Set dos exercícios em COMP, quanto nos exercícios em SIMP, não chegar até a falha máxima, manter 1 ou 2 repetições na reserva nas duas primeiras séries.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 max-w-[390px] mx-auto z-10">
        <div className="grid grid-cols-4 items-center">
          <Link href="/" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Início</span>
          </Link>
          <Link href="/fotos" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Fotos</span>
          </Link>
          <Link href="/comparacao" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Comparação</span>
          </Link>
          <Link href="/relatorio" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Relatório</span>
          </Link>
        </div>
      </nav>
    </div>
  );
} 