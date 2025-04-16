'use client';

import React, { useState, useEffect, useRef, TouchEvent, Suspense } from 'react';
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

// Componente principal exportado
export default function Fotos() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center"><p>Carregando...</p></div>}>
      <FotosContent />
    </Suspense>
  );
}

// Componente interno que usa useSearchParams
function FotosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isFromRelatorio = searchParams?.get('origem') === 'relatorio';
  const idParaRelatorio = searchParams?.get('id') || null;
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
  const [carregando, setCarregando] = useState(false);
  const [dataPesquisa, setDataPesquisa] = useState<string>("");

  // Verificar se deve mostrar o histórico com base no parâmetro da URL
  useEffect(() => {
    const historicoParam = searchParams?.get('historico');
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
    if (!registro.id) return;
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      await db.fotosProgresso.delete(registro.id);
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

  const toggleImagens = (registroId: number | undefined) => {
    if (!registroId) return;
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
      
      // Feedback visual antes de processar
      toast.loading("Processando fotos...");
      
      try {
        // Tentar salvar no localStorage em etapas para evitar o erro de quota
        try {
          // Abordagem alternativa: salvar o ID do registro em vez das imagens inteiras
          if (registro.id) {
            localStorage.setItem('fotos_relatorio_id', String(registro.id));
          }
          
          // Realizar o redirecionamento
          toast.dismiss();
          toast.success("Fotos selecionadas com sucesso!");
          
          // Navegar de volta para a página de relatório
          setTimeout(() => {
            window.location.href = "/relatorio";
          }, 500);
          
          return;
        } catch (storageError) {
          console.error("Erro ao salvar no localStorage, tentando otimização:", storageError);
          // Continuaremos para a otimização abaixo
        }
      } catch (error) {
        toast.dismiss();
        console.error("Erro ao selecionar fotos:", error);
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

  const handleSelecionarFotos = async () => {
    try {
      await handleUploadFoto('frente');
      await handleUploadFoto('costas');
      await handleUploadFoto('lateralEsquerda');
      await handleUploadFoto('lateralDireita');
      toast.success('Fotos adicionadas com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar fotos:', error);
      toast.error('Erro ao adicionar fotos');
    }
  };

  const salvarFotos = async () => {
    try {
      setCarregando(true);
      await handleSalvar();
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao salvar fotos:', error);
      toast.error('Erro ao salvar fotos');
      setCarregando(false);
    }
  };

  const formatarDataDDMMYY = (data: Date | string) => {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    return dataObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarDataParaInput = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-2 pb-1 px-6 bg-white backdrop-blur-sm shadow-sm">
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

            <div className="flex justify-center mt-6">
              <button
                onClick={salvarFotos}
                disabled={carregando}
                className="w-40 flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed transition-all duration-300"
              >
                {carregando ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Menu de navegação inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 max-w-[390px] mx-auto z-10">
        <div className="grid grid-cols-4 items-center">
          <Link href="/" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Início</span>
          </Link>
          
          <Link href="/fotos" className="flex flex-col items-center justify-center p-2 text-primary-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium">Fotos</span>
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

      {/* Tela de Histórico */}
      {mostrarHistorico && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 z-50">
          <div className="h-full flex flex-col">
            <header className="pt-2 pb-1 px-6 bg-white/80 backdrop-blur-sm shadow-sm">
              <div className="relative flex items-center justify-center max-w-5xl mx-auto">
                <div className="absolute left-0">
                  <button 
                    onClick={() => setMostrarHistorico(false)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
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
                
                {registros && registros.length > 0 ? (
                  <div className="space-y-4 pb-20">
                    {registros.map((registro) => (
                      <div 
                        key={registro.id || Math.random()}
                        className={`bg-white rounded-xl shadow-sm p-4 ${isFromRelatorio ? 'cursor-pointer hover:bg-primary-50 transition-colors' : ''}`}
                        onClick={(e) => {
                          if (isFromRelatorio) {
                            e.preventDefault();
                            const element = e.currentTarget;
                            element.classList.add('bg-primary-100');
                            setTimeout(() => {
                              selecionarParaRelatorio(registro, e);
                            }, 200);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {formatarDataDDMMYY(registro.data)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {registro.peso ? `${registro.peso}kg` : 'Peso não registrado'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (registro.id) {
                                  toggleImagens(registro.id);
                                }
                              }}
                              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary-600">
                                {registro.id && mostrarImagens[registro.id] ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                )}
                              </svg>
                            </button>
                            {!isFromRelatorio && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletarRegistro(registro);
                                }}
                                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {registro.id && mostrarImagens[registro.id] && (
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {dataPesquisa ? "Nenhum registro encontrado para esta data" : "Nenhum registro de fotos disponível"}
                  </div>
                )}
              </div>
            </main>

            {/* Menu de navegação inferior */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 max-w-[390px] mx-auto z-10">
              <div className="grid grid-cols-4 items-center">
                <Link href="/" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-xs mt-1 font-medium text-gray-500">Início</span>
                </Link>
                
                <Link href="/fotos" className="flex flex-col items-center justify-center p-2 text-primary-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs mt-1 font-medium">Fotos</span>
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
        </div>
      )}

      {/* Modal de Foto em Tela Cheia */}
      {fotoEmTelaCheia && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de fotos em tela cheia"
        >
          <button
            onClick={() => setFotoEmTelaCheia(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10 transition-all"
            aria-label="Fechar visualizador"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {fotosDisponiveis.length > 1 && (
            <>
              <button
                onClick={() => navegarFotos('anterior')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white p-2 bg-black/30 hover:bg-black/50 rounded-full transition-all"
                aria-label="Foto anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => navegarFotos('proxima')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white p-2 bg-black/30 hover:bg-black/50 rounded-full transition-all"
                aria-label="Próxima foto"
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
              className="max-h-screen max-w-full object-contain transition-opacity duration-300"
            />
          </div>

          {fotosDisponiveis.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center space-y-4">
              <div className="px-3 py-1 bg-black/40 rounded-full text-white text-sm">
                {fotoIndiceAtual + 1} / {fotosDisponiveis.length}
              </div>
              <div className="flex space-x-2">
                {fotosDisponiveis.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => {
                      setFotoIndiceAtual(index);
                      setFotoEmTelaCheia(fotosDisponiveis[index]);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === fotoIndiceAtual ? 'bg-white scale-125' : 'bg-gray-500 hover:bg-gray-300'
                    }`}
                    aria-label={`Ir para foto ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}