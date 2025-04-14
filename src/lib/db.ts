'use client';

import Dexie, { Table } from 'dexie';

export type TipoSerie = 'warm-up' | 'feeder' | 'work-set';
export type TipoExecucao = 'COMP' | 'SIMP';

export interface Serie {
  id?: number;
  exercicioId: number;
  numero: number;
  peso: number;
  tipo: TipoSerie;
}

export interface Exercicio {
  id?: number;
  treinoId: number;
  nome: string;
  tipoExecucao: TipoExecucao;
  numeroWorkSets: number;
  metaMin: number;
  metaMax: number;
  ordem: number;
}

export interface Treino {
  id?: number;
  data: Date;
  musculo: string;
  series?: number;
  carga?: number;
  repeticoes?: number;
  observacoes?: string;
  diaDaSemana?: number;
  nome?: string;
  categoria?: string;
}

export interface HistoricoExercicio {
  id?: number;
  exercicioId: number;
  data: Date;
  repeticoes: number;
  peso: number;
  tipo: TipoSerie;
  ordem: number;
  observacoes: string;
}

export interface Cardio {
  id?: number;
  data: Date;
  tipo: string;
  duracao: number;
  nivelBicicleta?: number;
  intensidade?: number;
  observacoes?: string;
}

export interface FotoProgresso {
  id?: number;
  data: Date;
  frente: string | null;
  costas: string | null;
  lateralEsquerda: string | null;
  lateralDireita: string | null;
  peso: number;
  observacoes?: string;
}

export interface HistoricoTreino {
  id?: number;
  treinoId: number;
  data: Date;
  exerciciosCompletos: number;
  exerciciosTotal: number;
  exercicios: {
    id: number;
    nome: string;
    series: {
      repeticoes: number;
      peso: number;
    }[];
  }[];
}

export interface Foto {
  id?: number;
  data: Date;
  url: string;
  descricao?: string;
  tipo?: 'frente' | 'costas' | 'lado_esquerdo' | 'lado_direito';
  peso?: number;
}

export interface TreinoRealizado {
  data: Date;
  tipo: string;
}

export interface RelatorioSemanal {
  id?: number;
  data: Date;
  dietaSemanal: string;
  comentarioTreino?: string;
  calorias?: number;
  peso?: number;
  treinos?: TreinoRealizado[];
  fotoIds?: number[];
  fotos?: string[];
}

export class AppDatabase extends Dexie {
  treinos: Dexie.Table<Treino, number>;
  exercicios!: Table<Exercicio>;
  series!: Table<Serie>;
  historico!: Table<HistoricoExercicio>;
  cardio: Dexie.Table<Cardio, number>;
  fotosProgresso!: Table<FotoProgresso>;
  historicoTreinos!: Table<HistoricoTreino>;
  fotos: Dexie.Table<Foto, number>;
  relatorios: Dexie.Table<RelatorioSemanal, number>;

  constructor() {
    super('AppTreino');
    
    // Versão completamente nova - 10
    // Deletamos o banco existente completamente e recriamos
    this.version(10).stores({
      treinos: '++id, data, musculo, diaDaSemana',
      exercicios: '++id, treinoId, nome, tipoExecucao, numeroWorkSets, metaMin, metaMax',
      series: '++id, exercicioId, numero, peso, tipo',
      historico: '++id, exercicioId, data, repeticoes, peso, tipo, ordem, observacoes, [exercicioId+data]',
      cardio: '++id, data, tipo',
      fotosProgresso: '++id, data, peso',
      historicoTreinos: '++id, treinoId, data, exerciciosCompletos, exerciciosTotal, exercicios',
      fotos: '++id, data, url, tipo, peso',
      relatorios: '++id, data'
    });
    
    // Define tipos para as tabelas
    this.treinos = this.table('treinos');
    this.cardio = this.table('cardio');
    this.fotos = this.table('fotos');
    this.relatorios = this.table('relatorios');
  }
}

export const db = new AppDatabase();

// Função para verificar se o IndexedDB está disponível
const checkIndexedDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB não está disponível no servidor'));
      return;
    }

    const testDb = window.indexedDB.open('test');
    testDb.onerror = () => {
      reject(new Error('IndexedDB não está disponível ou está bloqueado'));
    };
    testDb.onsuccess = () => {
      testDb.result.close();
      resolve(true);
    };
  });
};

// Inicializar o banco de dados com tratamento de erro
export const initDatabase = async () => {
  try {
    await checkIndexedDB();
    await db.open();
    console.log('Banco de dados inicializado com sucesso');
    return true;
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados:", error);
    return false;
  }
};

// Função para verificar se o banco de dados está pronto
export const isDatabaseReady = async () => {
  try {
    if (!db.isOpen()) {
      await initDatabase();
    }
    return db.isOpen();
  } catch (error) {
    console.error("Erro ao verificar o banco de dados:", error);
    return false;
  }
};

// Inicializar o banco de dados apenas no lado do cliente
if (typeof window !== 'undefined') {
  initDatabase();
} 