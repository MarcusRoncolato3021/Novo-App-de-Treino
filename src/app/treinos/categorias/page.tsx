'use client';

import React, { useState, useEffect } from 'react';
import { db, Treino } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const diasDaSemana = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function TreinosCategoria() {
  const searchParams = useSearchParams();
  const categoria = searchParams?.get('tipo') || 'superiores';
  const [treinosSalvos, setTreinosSalvos] = useState<Treino[]>([]);
  const [busca, setBusca] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);

  // Buscar todos os treinos da categoria especificada
  const treinos = useLiveQuery(
    () => db.treinos.where('categoria').equals(categoria).toArray()
  );

  // Treinos sem categoria definida
  const treinosSemCategoria = useLiveQuery(
    () => db.treinos
      .filter(treino => !treino.categoria || treino.categoria === '')
      .toArray()
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

  // Função para salvar a categoria em um treino existente
  const salvarCategoriaTreino = async (treinoId: number) => {
    try {
      await db.treinos.update(treinoId, { categoria });
      toast.success('Treino adicionado à categoria com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar treino à categoria:', error);
      toast.error('Erro ao adicionar treino à categoria');
    }
  };

  // Remover treino da categoria
  const removerDaCategoria = async (e: React.MouseEvent, treinoId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await db.treinos.update(treinoId, { categoria: '' });
      toast.success('Treino removido da categoria com sucesso!');
    } catch (error) {
      console.error('Erro ao remover treino da categoria:', error);
      toast.error('Erro ao remover treino da categoria');
    }
  };

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

  const getTituloCategoria = () => {
    switch (categoria) {
      case 'superiores':
        return 'Treinos de Superiores';
      case 'inferiores':
        return 'Treinos de Inferiores';
      case 'fullbody':
        return 'Treinos Full Body';
      default:
        return `Treinos de ${categoria}`;
    }
  };

  const formatarData = (data: string) => {
    if (!data) return '';
    return format(new Date(data), "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 font-sans pb-24">
      <header className="divide-y divide-gray-100">
        <div className="pt-4 pb-2 px-6 bg-gray-50/80 backdrop-blur-sm shadow-sm">
          <div className="flex justify-between items-center relative">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 -mt-1">{getTituloCategoria()}</h1>
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
        <div className="space-y-8">
          {/* Lista de treinos na categoria */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Treinos nesta categoria</h2>
            
            {treinosFiltrados?.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-6 text-center">
                <p className="text-gray-600 mb-4">
                  {busca.trim() 
                    ? "Nenhum treino encontrado para sua busca" 
                    : "Nenhum treino nesta categoria. Adicione um treino existente ou crie um novo."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {treinosFiltrados?.map((treino) => (
                  <div key={treino.id} className="block bg-white rounded-xl shadow-sm transition-all duration-300">
                    <Link
                      href={`/treino/${treino.id}`}
                      className={`block p-4 ${treino.ativo === false ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center">
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
                          
                          <button
                            onClick={(e) => removerDaCategoria(e, treino.id!)}
                            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                            title="Remover da categoria"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de treinos sem categoria definida */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Treinos disponíveis para adicionar</h2>
            
            {!treinosSemCategoria || treinosSemCategoria.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-6 text-center">
                <p className="text-gray-600">
                  Não há treinos disponíveis para adicionar a esta categoria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {treinosSemCategoria.map((treino) => (
                  <div key={treino.id} className="block bg-white rounded-xl shadow-sm transition-all duration-300">
                    <div className="p-4">
                      <div className="flex items-center">
                        <div className="bg-gray-100 rounded-lg p-3 mr-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h2 className="font-semibold text-lg text-gray-800">{treino.nome}</h2>
                            {treino.ativo === false && (
                              <span className="ml-2 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {treino.diaDaSemana !== undefined && treino.diaDaSemana >= 0 && treino.diaDaSemana < diasDaSemana.length 
                              ? diasDaSemana[treino.diaDaSemana] 
                              : 'Dia não definido'}
                          </p>
                        </div>
                        
                        <button
                          onClick={() => salvarCategoriaTreino(treino.id!)}
                          className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors duration-300"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 