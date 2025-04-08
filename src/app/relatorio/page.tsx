'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { db, RelatorioSemanal as DbRelatorioSemanal, TreinoRealizado as DbTreinoRealizado, Foto, FotoProgresso, isDatabaseReady, initDatabase } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
// Não precisamos do import dynamic aqui, vamos importar diretamente na função

// Definir o tipo para um relatório
type RelatorioSemanal = {
  id?: number;
  data: Date;
  dietaSemanal: string;
  comentarioTreino?: string;
  calorias?: number;
  treinos?: TreinoRealizado[];
  fotoIds?: number[];
};

// Tipo para treino realizado
type TreinoRealizado = {
  id?: number;
  data: Date;
  tipo: string;
};

// Componente principal com Suspense
export default function Relatorio() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    }>
      <RelatorioContent />
    </Suspense>
  );
}

// Componente interno que usa useSearchParams
function RelatorioContent() {
  const [isReady, setIsReady] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [dietaSemanal, setDietaSemanal] = useState('');
  const [comentarioTreino, setComentarioTreino] = useState('');
  const [calorias, setCalorias] = useState<string>('');
  const [activeTab, setActiveTab] = useState('relatorio');
  const [modalPdfVisible, setModalPdfVisible] = useState(false);
  const [relatoriosAnteriores, setRelatoriosAnteriores] = useState<RelatorioSemanal[]>([]);
  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioSemanal | null>(null);
  const [fotosIds, setFotosIds] = useState<number[]>([]);
  const [ultimoRegistroProcessado, setUltimoRegistroProcessado] = useState<string | null>(null);
  
  // Estados adicionais necessários para compatibilidade
  const [erroDatabase, setErroDatabase] = useState<string | null>(null);
  const [dataPesquisa, setDataPesquisa] = useState('');
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<RelatorioSemanal[]>([]);
  const [treinosSemanais, setTreinosSemanais] = useState<TreinoRealizado[]>([]);
  const [relatorioEditando, setRelatorioEditando] = useState<number | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mostrarModalFotos, setMostrarModalFotos] = useState(false);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<number[]>([]);
  const [fotosSelecionadasInfo, setFotosSelecionadasInfo] = useState<any[]>([]);
  const [fotosCarregando, setFotosCarregando] = useState<boolean>(false);
  const [dataComparacaoAntes, setDataComparacaoAntes] = useState<string>('');
  const [dataComparacaoDepois, setDataComparacaoDepois] = useState<string>('');
  const [fotoComparacaoAntes, setFotoComparacaoAntes] = useState<FotoProgresso | null>(null);
  const [fotoComparacaoDepois, setFotoComparacaoDepois] = useState<FotoProgresso | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<'frente' | 'costas' | 'lado_esquerdo' | 'lado_direito'>('frente');
  
  // Estados para comparação de relatórios
  const [relatorioAnterior, setRelatorioAnterior] = useState<RelatorioSemanal | null>(null);
  const [relatorioMaisRecente, setRelatorioMaisRecente] = useState<RelatorioSemanal | null>(null);
  const [fotosRelatorioAnterior, setFotosRelatorioAnterior] = useState<Foto[]>([]);
  const [fotosRelatorioRecente, setFotosRelatorioRecente] = useState<Foto[]>([]);
  const [pesoRelatorioAnterior, setPesoRelatorioAnterior] = useState<number | null>(null);
  const [pesoRelatorioRecente, setPesoRelatorioRecente] = useState<number | null>(null);
  const [mostrarComparacao, setMostrarComparacao] = useState<boolean>(false);
  const [exportandoPDF, setExportandoPDF] = useState<boolean>(false);
  const [relatoriosPesos, setRelatoriosPesos] = useState<{[id: number]: number}>({});
  const comparacaoRef = useRef<HTMLDivElement>(null);
  const [fotoTelaCheia, setFotoTelaCheia] = useState<string | null>(null);
  const [fotoDetalhes, setFotoDetalhes] = useState<{data: Date, tipo?: string, peso?: number} | null>(null);
  
  const searchParams = useSearchParams();

  // Tipos de fotos para exibição
  const tiposFoto = [
    { id: 'frente', nome: 'Frente', icone: '👤' },
    { id: 'costas', nome: 'Costas', icone: '👤' },
    { id: 'lado_esquerdo', nome: 'Lado Esq.', icone: '👤' },
    { id: 'lado_direito', nome: 'Lado Dir.', icone: '👤' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'dietaSemanal') {
      setDietaSemanal(value);
    } else if (name === 'calorias') {
      setCalorias(value);
    } else if (name === 'comentarioTreino') {
      setComentarioTreino(value);
    }
  };

  // Restante do código existente...
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      {/* Todo o JSX existente */}
    </div>
  );
} 