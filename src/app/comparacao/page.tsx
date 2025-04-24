'use client';

import React, { useState, useEffect } from 'react';
import { db, FotoProgresso } from '@/lib/db';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const tiposFoto = [
  { id: 'frente', nome: 'Frente', icone: '👤' },
  { id: 'costas', nome: 'Costas', icone: '👤' },
  { id: 'lado_esquerdo', nome: 'Lado Esq.', icone: '👤' },
  { id: 'lado_direito', nome: 'Lado Dir.', icone: '👤' }
];

export default function Comparacao() {
  const [dataAntes, setDataAntes] = useState<string>('');
  const [dataDepois, setDataDepois] = useState<string>('');
  const [tipoSelecionado, setTipoSelecionado] = useState<'frente' | 'costas' | 'lado_esquerdo' | 'lado_direito'>('frente');
  const [fotoAntes, setFotoAntes] = useState<FotoProgresso | null>(null);
  const [fotoDepois, setFotoDepois] = useState<FotoProgresso | null>(null);
  const [modoTelaCheia, setModoTelaCheia] = useState(false);
  const [fotosProgresso, setFotosProgresso] = useState<FotoProgresso[]>([]);
  const [datasDisponiveis, setDatasDisponiveis] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Função para formatar a data no formato DD/MM/YYYY
  function formatarDataDDMMYY(data: Date): string {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Efeito para carregar os dados iniciais
  useEffect(() => {
    buscarHistoricoFotos();
  }, []);

  // Função para buscar o histórico de fotos e preparar para a comparação
  const buscarHistoricoFotos = async () => {
    try {
      setCarregando(true);
      console.log("Buscando histórico de fotos para comparação...");
      
      // Buscar todos os registros de fotos de progresso
      const registros = await db.fotosProgresso
        .orderBy('data')
        .reverse()
        .toArray();
      
      console.log("Registros de fotos encontrados:", registros.length);
      
      if (registros.length === 0) {
        setCarregando(false);
        toast.error("Nenhum registro de foto encontrado");
        return;
      }
      
      // Resolver problema de fuso horário para todos os registros de fotos
      const registrosAjustados = registros.map(registro => {
        const dataOriginal = new Date(registro.data);
        // Criar nova data às 12:00 para evitar problemas de fuso
        const dataCorrigida = new Date(
          dataOriginal.getFullYear(),
          dataOriginal.getMonth(),
          dataOriginal.getDate(),
          12, 0, 0
        );
        
        return {
          ...registro,
          data: dataCorrigida
        };
      });
      
      console.log("Datas ajustadas para registros de fotos");
      
      // Extrair apenas as datas para o select no formato ISO
      const datasISO = registrosAjustados.map(registro => 
        registro.data.toISOString().split('T')[0]
      );
      
      setFotosProgresso(registrosAjustados);
      setDatasDisponiveis(datasISO);
      
      console.log("Dados preparados para comparação:", datasISO.length, "datas disponíveis");
      
      if (datasISO.length >= 2) {
        // Selecionar automaticamente as duas datas mais recentes
        setDataDepois(datasISO[0]);
        setDataAntes(datasISO[1]);
      }
      
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao buscar histórico de fotos:', error);
      toast.error("Erro ao carregar os dados de fotos");
      setCarregando(false);
    }
  };

  // Efeito para buscar fotos quando as datas mudarem
  useEffect(() => {
    const buscarFotosParaComparacao = async () => {
      if (!dataAntes || !dataDepois || dataAntes === dataDepois || fotosProgresso.length === 0) {
        setFotoAntes(null);
        setFotoDepois(null);
        return;
      }
      
      console.log("Buscando fotos para comparação. Data Antes:", dataAntes, "Data Depois:", dataDepois);
      
      try {
        // Buscar registro para a data "antes"
        const registroAntes = fotosProgresso.find(registro => {
          const dataISO = registro.data.toISOString().split('T')[0];
          return dataISO === dataAntes;
        });
        
        // Buscar registro para a data "depois"
        const registroDepois = fotosProgresso.find(registro => {
          const dataISO = registro.data.toISOString().split('T')[0];
          return dataISO === dataDepois;
        });
        
        console.log("Registro encontrado para data 'antes':", 
          registroAntes ? formatarDataDDMMYY(registroAntes.data) : "Não encontrado");
        console.log("Registro encontrado para data 'depois':", 
          registroDepois ? formatarDataDDMMYY(registroDepois.data) : "Não encontrado");
        
        setFotoAntes(registroAntes || null);
        setFotoDepois(registroDepois || null);
      } catch (error) {
        console.error("Erro ao buscar fotos para comparação:", error);
        toast.error("Erro ao recuperar fotos para comparação");
      }
    };
    
    buscarFotosParaComparacao();
  }, [dataAntes, dataDepois, fotosProgresso]);

  const handleDataAntesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaData = e.target.value;
    setDataAntes(novaData);
    
    // Se a data "depois" for igual à nova data "antes", limpar a data "depois"
    if (novaData === dataDepois) {
      setDataDepois('');
    }
  };

  const handleDataDepoisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaData = e.target.value;
    setDataDepois(novaData);
    
    // Se a data "antes" for igual à nova data "depois", limpar a data "antes"
    if (novaData === dataAntes) {
      setDataAntes('');
    }
  };

  const getUrlFoto = (foto: FotoProgresso | null, tipo: string) => {
    if (!foto) return null;
    
    // Verificar se a foto existe antes de retornar a URL
    let url = null;
    switch (tipo) {
      case 'frente':
        url = foto.frente;
        break;
      case 'costas':
        url = foto.costas;
        break;
      case 'lado_esquerdo':
        url = foto.lateralEsquerda;
        break;
      case 'lado_direito':
        url = foto.lateralDireita;
        break;
    }
    
    return url;
  };

  const getImageOrientation = (tipo: string) => {
    switch (tipo) {
      case 'frente':
      case 'costas':
        return 'rotate-0';
      case 'lado_esquerdo':
      case 'lado_direito':
        return 'rotate-90';
      default:
        return 'rotate-0';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-4 pb-2 px-6 bg-white backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center max-w-5xl mx-auto">
          <div className="absolute left-0 -ml-2">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
          </div>

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 -mt-1">
            Comparação
          </h1>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        {carregando ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 text-center w-full">Tipo de Foto</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {tiposFoto.map(tipo => (
                  <button
                    key={tipo.id}
                    onClick={() => setTipoSelecionado(tipo.id as 'frente' | 'costas' | 'lado_esquerdo' | 'lado_direito')}
                    className={`px-4 py-2 rounded-lg text-center ${
                      tipoSelecionado === tipo.id
                        ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {tipo.nome}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    Data Antes
                  </label>
                  <select
                    value={dataAntes}
                    onChange={handleDataAntesChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                  >
                    <option value="">Selecione uma data</option>
                    {datasDisponiveis.map((data, index) => (
                      <option key={`antes-${data}-${index}`} value={data}>
                        {formatarDataDDMMYY(new Date(data))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">
                    Data Depois
                  </label>
                  <select
                    value={dataDepois}
                    onChange={handleDataDepoisChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                  >
                    <option value="">Selecione uma data</option>
                    {datasDisponiveis.map((data, index) => (
                      <option key={`depois-${data}-${index}`} value={data}>
                        {formatarDataDDMMYY(new Date(data))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-center items-center">
                    <h3 className="text-lg font-semibold text-gray-800 text-center">
                      {dataAntes && fotoAntes ? formatarDataDDMMYY(fotoAntes.data) : 'Selecione uma data'}
                    </h3>
                    {fotoAntes && (
                      <div className="text-sm font-medium text-gray-600 ml-2">
                        {fotoAntes.peso} kg
                      </div>
                    )}
                  </div>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
                    {fotoAntes && getUrlFoto(fotoAntes, tipoSelecionado) ? (
                      <img
                        src={getUrlFoto(fotoAntes, tipoSelecionado) || ''}
                        alt="Foto antes"
                        className={`w-full h-full object-cover ${getImageOrientation(tipoSelecionado)}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-center">
                        Nenhuma foto disponível
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-center items-center">
                    <h3 className="text-lg font-semibold text-gray-800 text-center">
                      {dataDepois && fotoDepois ? formatarDataDDMMYY(fotoDepois.data) : 'Selecione uma data'}
                    </h3>
                    {fotoDepois && (
                      <div className="text-sm font-medium text-gray-600 ml-2">
                        {fotoDepois.peso} kg
                      </div>
                    )}
                  </div>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
                    {fotoDepois && getUrlFoto(fotoDepois, tipoSelecionado) ? (
                      <img
                        src={getUrlFoto(fotoDepois, tipoSelecionado) || ''}
                        alt="Foto depois"
                        className={`w-full h-full object-cover ${getImageOrientation(tipoSelecionado)}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-center">
                        Nenhuma foto disponível
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {fotoAntes && fotoDepois && getUrlFoto(fotoAntes, tipoSelecionado) && getUrlFoto(fotoDepois, tipoSelecionado) && (
                <button
                  onClick={() => setModoTelaCheia(true)}
                  className="mt-6 w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Comparar em Tela Cheia
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Tela Cheia */}
      {modoTelaCheia && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-semibold">
                {fotoAntes ? formatarDataDDMMYY(fotoAntes.data) : ''} vs {fotoDepois ? formatarDataDDMMYY(fotoDepois.data) : ''}
              </h2>
              <div className="text-white/80 text-sm">
                {fotoAntes?.peso} kg vs {fotoDepois?.peso} kg
                {fotoAntes && fotoDepois && (
                  <span className={`ml-2 ${fotoDepois.peso < fotoAntes.peso ? 'text-green-500' : 'text-red-500'}`}>
                    ({fotoDepois.peso < fotoAntes.peso ? '-' : '+'}{Math.abs(fotoDepois.peso - fotoAntes.peso).toFixed(1)} kg)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setModoTelaCheia(false)}
              className="p-2 text-white hover:text-gray-300 transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 relative">
                  <img
                    src={fotoAntes && getUrlFoto(fotoAntes, tipoSelecionado) || ''}
                    alt="Foto antes"
                    className={`absolute inset-0 w-full h-full object-contain bg-black ${getImageOrientation(tipoSelecionado)}`}
                  />
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    Antes - {fotoAntes?.peso}kg
                  </div>
                </div>
                <div className="flex-1 relative">
                  <img
                    src={fotoDepois && getUrlFoto(fotoDepois, tipoSelecionado) || ''}
                    alt="Foto depois"
                    className={`absolute inset-0 w-full h-full object-contain bg-black ${getImageOrientation(tipoSelecionado)}`}
                  />
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    Depois - {fotoDepois?.peso}kg
                  </div>
                </div>
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-primary-600">Comparação</span>
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
