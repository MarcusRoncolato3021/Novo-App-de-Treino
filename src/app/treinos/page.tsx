'use client';

import React, { useState, Suspense } from 'react';
import { db, Treino } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Exercicio } from '@/lib/db';
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

interface EditarCargasModalProps {
  exercicio: Exercicio;
  onClose: () => void;
}

function TreinosContent() {
  const searchParams = useSearchParams();
  const categoria = searchParams?.get('categoria') || '';
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [busca, setBusca] = useState('');
  const [expandedTreinos, setExpandedTreinos] = useState<Record<number, boolean>>({});

  // Buscar todos os treinos, independente da categoria
  const treinos = useLiveQuery(
    () => categoria
      ? db.treinos.where('categoria').equals(categoria).toArray()
      : db.treinos.toArray()
  );

  // Filtrar treinos ativos/inativos e pela busca
  const treinosFiltrados = React.useMemo(() => {
    if (!treinos) return [];
    
    // Filtragem por status (ativo/inativo)
    let treinosPorStatus = mostrarInativos 
      ? treinos 
      : treinos.filter(treino => treino.ativo !== false);
    
    // Filtragem por termo de busca
    if (busca.trim()) {
      const termoBusca = busca.toLowerCase().trim();
      return treinosPorStatus.filter(treino => 
        treino.nome?.toLowerCase().includes(termoBusca) || 
        diasDaSemana[treino.diaDaSemana !== undefined ? treino.diaDaSemana % 7 : 0]
          .toLowerCase().includes(termoBusca)
      );
    }
    
    return treinosPorStatus;
  }, [treinos, mostrarInativos, busca]);

  const exercicios = useLiveQuery(
    () => db.exercicios.where('treinoId').anyOf(treinosFiltrados?.map(t => t.id!) || []).toArray(),
    [treinosFiltrados]
  );

  // Alternar status do treino (ativo/inativo)
  const alternarStatusTreino = async (e: React.MouseEvent, treinoId: number, novoStatus: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await db.treinos.update(treinoId, { ativo: novoStatus });
      toast.success(`Treino ${novoStatus ? 'ativado' : 'inativado'} com sucesso!`);
    } catch (error) {
      console.error(`Erro ao ${novoStatus ? 'ativar' : 'inativar'} treino:`, error);
      toast.error(`Erro ao ${novoStatus ? 'ativar' : 'inativar'} treino`);
    }
  };

  // Alternar expansão dos exercícios do treino
  const toggleTreinoExercicios = (e: React.MouseEvent, treinoId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setExpandedTreinos(prev => ({
      ...prev,
      [treinoId]: !prev[treinoId]
    }));
  };

  const getTituloCategoria = () => {
    switch (categoria) {
      case 'superiores':
        return 'Treinos de Superiores';
      case 'inferiores':
        return 'Treinos de Inferiores';
      default:
        return 'Todos os Treinos';
    }
  };

  const getExerciciosTreino = (treinoId: number) => {
    return exercicios?.filter(e => e.treinoId === treinoId) || [];
  };

  const EditarCargasModal = ({ exercicio, onClose }: EditarCargasModalProps) => {
    if (!exercicio) return null;

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warm-up</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                defaultValue="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feeder Sets</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                defaultValue="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Sets</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                defaultValue="0"
              />
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
              onClick={() => {
                // Salvar alterações
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen font-sans pb-24">
      <header className="divide-y divide-gray-100">
        <div className="pt-2 pb-1 px-6 bg-white backdrop-blur-sm shadow-sm">
          <div className="flex justify-between items-center relative">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 mb-1">{getTituloCategoria()}</h1>
            <div className="w-10"></div> {/* Espaçador para manter o alinhamento centralizado */}
          </div>
        </div>
        
        <div className="px-6 py-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          {/* Barra de pesquisa */}
          <div className="relative mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar treinos por nome ou dia..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full py-2 pl-10 pr-4 rounded-xl bg-white shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300"
            />
          </div>
          
          {/* Opção para mostrar treinos inativos */}
          <div className="flex items-center mb-4 bg-white p-3 rounded-xl shadow-sm">
            <label className="flex items-center cursor-pointer">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${mostrarInativos ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                <input
                  type="checkbox"
                  checked={mostrarInativos}
                  onChange={(e) => setMostrarInativos(e.target.checked)}
                  className="sr-only" // Oculto visualmente, mas ainda acessível
                />
                {mostrarInativos && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-gray-700 font-medium">Mostrar treinos inativos</span>
            </label>
          </div>
        </div>
      </header>

      <main className="px-6">
        {treinosFiltrados?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">
              {busca.trim() 
                ? "Nenhum treino encontrado para sua busca" 
                : mostrarInativos 
                  ? "Nenhum treino registrado" 
                  : "Nenhum treino ativo. Ative um treino ou adicione um novo."}
            </p>
            <Link
              href="/"
              className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300"
            >
              Adicionar novo treino
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {treinosFiltrados?.map((treino) => (
              <div key={treino.id} className="block bg-white rounded-xl shadow-sm transition-all duration-300">
                <Link
                  href={`/treino/${treino.id}`}
                  className={`block p-4 ${treino.ativo === false ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center mb-3">
                    <div className="bg-primary-100 rounded-lg p-3 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h2 className="font-semibold text-lg text-gray-800">{treino.nome}</h2>
                        {treino.ativo === false ? (
                          <span className="ml-2 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full">
                            Inativo
                          </span>
                        ) : (
                          <span className="ml-2 px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {treino.diaDaSemana !== undefined && treino.diaDaSemana >= 0 && treino.diaDaSemana < diasDaSemana.length 
                          ? diasDaSemana[treino.diaDaSemana] 
                          : 'Dia não definido'}
                      </p>
                    </div>
                    
                    {/* Botões de ação atualizados */}
                    <div className="flex space-x-2">
                      {treino.ativo === false ? (
                        <button
                          onClick={(e) => alternarStatusTreino(e, treino.id!, true)}
                          className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                          title="Ativar treino"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => alternarStatusTreino(e, treino.id!, false)}
                          className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                          title="Inativar treino"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Botão para mostrar/ocultar exercícios */}
                      <button
                        onClick={(e) => toggleTreinoExercicios(e, treino.id!)}
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Mostrar/ocultar exercícios"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 transform transition-transform ${expandedTreinos[treino.id!] ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>

                {/* Exercícios do treino - mostrados quando expandido */}
                {expandedTreinos[treino.id!] && (
                  <div className="px-4 pb-4 border-t border-gray-100 mt-1 pt-3">
                    <div className="space-y-2">
                      {getExerciciosTreino(treino.id!).length === 0 ? (
                        <p className="text-sm text-center text-gray-500 py-2">Nenhum exercício cadastrado</p>
                      ) : (
                        getExerciciosTreino(treino.id!).map((exercicio, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-gray-800">{exercicio.nome}</h3>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedExercicio(exercicio);
                                  setModalOpen(true);
                                }}
                                className="text-primary-600 hover:text-primary-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">Cargas:</span>
                                <span className="font-medium text-gray-800">0/0/0</span>
                                <span className="text-gray-500">kg</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500">Meta:</span>
                                <span className="font-medium text-gray-800">
                                  {exercicio.metaMin}-{exercicio.metaMax}
                                </span>
                                <span className="text-gray-500">reps</span>
                              </div>
                            </div>

                            {exercicio.tipoExecucao !== 'SIMP' && (
                              <div className="mt-2">
                                <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                                  {exercicio.tipoExecucao}
                                </span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && selectedExercicio && (
        <EditarCargasModal
          exercicio={selectedExercicio}
          onClose={() => {
            setModalOpen(false);
            setSelectedExercicio(null);
          }}
        />
      )}
    </div>
  );
}

export default function TreinosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TreinosContent />
    </Suspense>
  );
} 
