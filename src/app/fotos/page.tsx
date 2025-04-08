'use client';

import React, { useState, useEffect, useRef, TouchEvent } from 'react';
import { db, FotoProgresso } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useSearchParams, useRouter } from 'next/navigation';
import { navegarCom } from '@/lib/utils/navigation';

const tiposFoto = [
  { id: 'frente', nome: 'Frente', icone: '👤' },
  { id: 'costas', nome: 'Costas', icone: '👤' },
  { id: 'lado_esquerdo', nome: 'Lado Esq.', icone: '👤' },
  { id: 'lado_direito', nome: 'Lado Dir.', icone: '👤' }
];

export default function FotosPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isFromRelatorio = searchParams.get('origem') === 'relatorio';
  const [fotos, setFotos] = useState<FotoProgresso>({
    data: new Date(),
    frente: null,
    costas: null,
    lateralEsquerda: null,
    lateralDireita: null,
    peso: 0
  });

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [fotoEmTelaCheia, setFotoEmTelaCheia] = useState<string | null>(null);
  const [mostrarImagens, setMostrarImagens] = useState<{ [key: number]: boolean }>({});
  const [fotoIndiceAtual, setFotoIndiceAtual] = useState<number>(0);
  const [fotosDisponiveis, setFotosDisponiveis] = useState<string[]>([]);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const swipeThreshold = 50; // Mínimo de pixels para considerar um swipe
  const [dataPesquisa, setDataPesquisa] = useState('');
  const [registrosFiltrados, setRegistrosFiltrados] = useState<FotoProgresso[]>([]);

  // Verificar se deve mostrar o histórico com base no parâmetro da URL
  useEffect(() => {
    const historicoParam = searchParams.get('historico');
    if (historicoParam === 'true') {
      setMostrarHistorico(true);
    }
  }, [searchParams]);

  // Buscar registros existentes
  const registros = useLiveQuery(
    () => db.fotosProgresso
      .orderBy('data')
      .reverse()
      .toArray()
  );

  // Filtrar registros baseado na pesquisa
  useEffect(() => {
    if (!registros) return;

    if (!dataPesquisa) {
      setRegistrosFiltrados(registros);
      return;
    }

    const filtrados = registros.filter((registro) => {
      const dataRegistro = new Date(registro.data);
      const dataFormatada = dataRegistro.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      return dataFormatada.includes(dataPesquisa);
    });

    setRegistrosFiltrados(filtrados);
  }, [dataPesquisa, registros]);

  const handleUploadFoto = async (tipo: keyof FotoProgresso) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          setFotos(prev => ({
            ...prev,
            [tipo]: base64
          }));
        };
        reader.readAsDataURL(file);
      };

      input.click();
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto');
    }
  };

  const handleSalvar = async () => {
    try {
      await db.fotosProgresso.add(fotos);
      setFotos({
        data: new Date(),
        frente: null,
        costas: null,
        lateralEsquerda: null,
        lateralDireita: null,
        peso: 0
      });
      toast.success('Fotos salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar fotos:', error);
      toast.error('Erro ao salvar fotos');
    }
  };

  const limparBancoDados = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) return;
    
    try {
      // Limpar todas as tabelas do banco de dados
      await db.fotosProgresso.clear();
      await db.fotos.clear();
      await db.relatorios.clear();
      await db.treinos.clear();
      await db.cardio.clear();
      
      // Limpar estados locais
      setMostrarImagens({});
      setFotoEmTelaCheia(null);
      
      toast.success('Todos os dados foram apagados com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar banco de dados:', error);
      toast.error('Erro ao limpar dados');
    }
  };

  const handleDeletarRegistro = async (registro: FotoProgresso) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      await db.fotosProgresso.delete(registro.id!);
      toast.success('Registro excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast.error('Erro ao excluir registro');
    }
  };

  const getTituloFoto = (tipo: keyof FotoProgresso): string => {
    switch (tipo) {
      case 'frente': return 'Frente';
      case 'costas': return 'Costas';
      case 'lateralEsquerda': return 'Lado Esquerdo';
      case 'lateralDireita': return 'Lado Direito';
      default: return '';
    }
  };

  const toggleImagens = (registroId: number) => {
    setMostrarImagens(prev => ({
      ...prev,
      [registroId]: !prev[registroId]
    }));
  };

  // Função para selecionar uma foto para o relatório
  const selecionarParaRelatorio = (registro: FotoProgresso, event?: React.MouseEvent) => {
    // Impedir a propagação do evento se for passado
    if (event) {
      event.stopPropagation();
    }
    
    if (isFromRelatorio && registro.id) {
      console.log("Selecionando fotos do registro para relatório:", registro.id);
      
      // Verificar se o registro tem fotos
      if (!registro.frente && !registro.costas && !registro.lateralEsquerda && !registro.lateralDireita) {
        toast.error("Este registro não possui fotos");
        return;
      }
      
      // Feedback visual antes de navegar
      toast.success("Registro selecionado! Redirecionando...");
      
      try {
        // Adicionar todas as fotos disponíveis como parâmetros na URL
        const params = new URLSearchParams();
        params.append('registroId', registro.id.toString());
        params.append('preserveForm', 'true');
        
        // Usar o utilitário de navegação para garantir redirecionamento consistente
        navegarCom(router, `/relatorio?${params.toString()}`, {
          delay: 300,
          onError: (erro: Error) => {
            console.error("Erro na navegação:", erro);
            toast.error("Erro ao selecionar fotos. Tente novamente.");
          }
        });
      } catch (error) {
        console.error("Erro ao iniciar navegação:", error);
        toast.error("Erro ao selecionar fotos. Tente novamente.");
      }
    }
  };

  // Função para abrir foto em tela cheia e preparar navegação
  const abrirFotoEmTelaCheia = (foto: string, registro: FotoProgresso) => {
    // Coletar todas as fotos disponíveis do registro
    const fotos: string[] = [];
    ['frente', 'costas', 'lateralEsquerda', 'lateralDireita'].forEach(tipo => {
      const fotoUrl = registro[tipo as keyof FotoProgresso] as string;
      if (fotoUrl) {
        fotos.push(fotoUrl);
      }
    });
    
    setFotosDisponiveis(fotos);
    setFotoIndiceAtual(fotos.indexOf(foto));
    setFotoEmTelaCheia(foto);
  };

  // Função para navegar entre fotos
  const navegarFotos = (direcao: 'anterior' | 'proxima') => {
    if (fotosDisponiveis.length <= 1) return;
    
    let novoIndice = fotoIndiceAtual;
    
    if (direcao === 'anterior') {
      novoIndice = (novoIndice - 1 + fotosDisponiveis.length) % fotosDisponiveis.length;
    } else {
      novoIndice = (novoIndice + 1) % fotosDisponiveis.length;
    }
    
    setFotoIndiceAtual(novoIndice);
    setFotoEmTelaCheia(fotosDisponiveis[novoIndice]);
  };

  // Funções para lidar com eventos de toque
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    // Calcular a distância do swipe
    const swipeDistance = touchEndX - touchStartX;
    
    // Se a distância for maior que o limite, navegar para a esquerda ou direita
    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe para a direita - foto anterior
        navegarFotos('anterior');
      } else {
        // Swipe para a esquerda - próxima foto
        navegarFotos('proxima');
      }
    }
    
    // Resetar valores
    setTouchStartX(0);
    setTouchEndX(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-6 pb-4 px-6 bg-gray-50/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center max-w-5xl mx-auto">
          <div className="absolute left-0">
            {isFromRelatorio ? (
              <Link href="/relatorio" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </Link>
            ) : (
              <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </Link>
            )}
          </div>

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
            {isFromRelatorio && mostrarHistorico ? 'Selecionar Foto' : 'Fotos'}
          </h1>

          <div className="absolute right-0">
            <button 
              onClick={() => setMostrarHistorico(!mostrarHistorico)}
              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-4 max-w-5xl mx-auto space-y-6">
        {/* Seção de Registro */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center space-x-4 w-full max-w-[250px]">
                <h2 className="text-base font-medium text-gray-700 whitespace-nowrap">
                  Peso (kg)
                </h2>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={fotos.peso || ''}
                    onChange={(e) => setFotos(prev => ({ ...prev, peso: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base font-medium text-center"
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500 text-base font-medium">kg</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Último peso:</span>
                  <span className="font-medium">{registros?.[0]?.peso || '0.0'} kg</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">Data:</span>
                  <span className="font-medium">{registros?.[0] ? new Date(registros[0].data).toLocaleDateString('pt-BR') : '--/--/----'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['frente', 'costas', 'lateralEsquerda', 'lateralDireita'].map((tipo) => (
                <div key={tipo} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 text-center">
                    {getTituloFoto(tipo as keyof FotoProgresso)}
                  </label>
                  <div className="aspect-[5/6] bg-gray-100 rounded-xl overflow-hidden relative">
                    {fotos[tipo as keyof FotoProgresso] ? (
                      <>
                        <img
                          src={fotos[tipo as keyof FotoProgresso] as string}
                          alt={getTituloFoto(tipo as keyof FotoProgresso)}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleUploadFoto(tipo as keyof FotoProgresso)}
                          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300"
                        >
                          <span className="text-white text-sm">Alterar foto</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUploadFoto(tipo as keyof FotoProgresso)}
                        className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 hover:text-gray-500 transition-colors duration-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs">Adicionar foto</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSalvar}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300"
            >
              Salvar
            </button>
          </div>
        </div>
      </main>

      {/* Tela de Histórico */}
      {mostrarHistorico && (
        <div className="fixed inset-0 bg-white z-50">
          <div className="h-full flex flex-col">
            <header className="pt-8 pb-6 px-6 bg-primary-50/80 backdrop-blur-sm shadow-sm">
              <div className="relative flex items-center justify-center max-w-5xl mx-auto">
                <div className="absolute left-0">
                  <button 
                    onClick={() => setMostrarHistorico(false)}
                    className="p-2 rounded-full hover:bg-primary-100 transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                  </button>
                </div>

                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
                  {isFromRelatorio ? 'Selecionar Foto' : 'Histórico'}
                </h2>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-4">
              <div className="max-w-5xl mx-auto space-y-4">
                {isFromRelatorio && (
                  <div className="mb-4 bg-blue-50 p-4 rounded-xl text-blue-800 text-sm">
                    Selecione um registro para adicionar ao seu relatório
                  </div>
                )}
                
                {/* Barra de pesquisa */}
                <div className="relative w-full max-w-md mx-auto mb-4">
                  <input
                    type="text"
                    placeholder="Pesquisar por data (ex: 01/05/2023)"
                    value={dataPesquisa}
                    onChange={(e) => setDataPesquisa(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {dataPesquisa && (
                    <button 
                      onClick={() => setDataPesquisa('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {registrosFiltrados?.length > 0 ? (
                  registrosFiltrados.map((registro) => (
                    <div 
                      key={registro.id} 
                      className={`bg-white rounded-xl shadow-sm p-4 ${isFromRelatorio ? 'cursor-pointer hover:bg-primary-50 transition-colors' : ''}`}
                      onClick={(e) => {
                        if (isFromRelatorio) {
                          e.preventDefault();
                          
                          // Feedback visual
                          const element = e.currentTarget;
                          element.classList.add('bg-primary-100');
                          
                          // Pequeno atraso para feedback visual
                          setTimeout(() => {
                            selecionarParaRelatorio(registro, e);
                          }, 200);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {new Date(registro.data).toLocaleDateString('pt-BR')}
                          </h3>
                          <p className="text-sm text-gray-500">{registro.peso} kg</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isFromRelatorio && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                
                                // Feedback visual para o usuário
                                const button = e.currentTarget;
                                button.classList.add('bg-primary-300');
                                
                                // Selecionar a foto com um pequeno atraso para feedback visual
                                setTimeout(() => {
                                  selecionarParaRelatorio(registro, e);
                                }, 200);
                              }}
                              className="p-2 bg-primary-100 rounded-full text-primary-700 hover:bg-primary-200 transition-all duration-300"
                              aria-label="Selecionar foto para relatório"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleImagens(registro.id!);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                              {mostrarImagens[registro.id!] ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              )}
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          {!isFromRelatorio && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletarRegistro(registro);
                              }}
                              className="text-red-500 hover:text-red-700 p-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {mostrarImagens[registro.id!] && (
                        <div className="grid grid-cols-2 gap-4">
                          {['frente', 'costas', 'lateralEsquerda', 'lateralDireita'].map((tipo) => (
                            <div key={tipo} className="aspect-[5/6] bg-gray-100 rounded-xl overflow-hidden relative">
                              {registro[tipo as keyof FotoProgresso] ? (
                                <img
                                  src={registro[tipo as keyof FotoProgresso] as string}
                                  alt={getTituloFoto(tipo as keyof FotoProgresso)}
                                  className="w-full h-full object-cover cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirFotoEmTelaCheia(registro[tipo as keyof FotoProgresso] as string, registro);
                                  }}
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  Sem foto
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    {dataPesquisa ? "Nenhum registro encontrado para esta data" : "Nenhum registro de fotos disponível"}
                  </p>
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Modal de Foto em Tela Cheia */}
      {fotoEmTelaCheia && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setFotoEmTelaCheia(null)}
            className="absolute top-4 right-4 text-white p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {fotosDisponiveis.length > 1 && (
            <>
              <button
                onClick={() => navegarFotos('anterior')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white p-2 bg-black bg-opacity-30 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navegarFotos('proxima')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white p-2 bg-black bg-opacity-30 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div 
            className="w-full h-full flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={fotoEmTelaCheia}
              alt="Foto em tela cheia"
              className="max-h-screen max-w-full object-contain"
            />
          </div>

          {fotosDisponiveis.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <div className="flex space-x-2">
                {fotosDisponiveis.map((_, index) => (
                  <div 
                    key={index} 
                    className={`w-2 h-2 rounded-full ${
                      index === fotoIndiceAtual ? 'bg-white' : 'bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-primary-600">Fotos</span>
          </Link>
          <Link href="/comparacao" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Comparação</span>
          </Link>
          <Link href="/relatorio" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Relatório</span>
          </Link>
        </div>
      </nav>
    </div>
  );
} 
