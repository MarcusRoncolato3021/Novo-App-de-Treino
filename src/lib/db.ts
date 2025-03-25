'use client';

import Dexie, { Table } from 'dexie';

export type TipoExecucao = 'SIMP' | 'COMP';
export type TipoSerie = 'warm-up' | 'feeder' | 'work-set';

export interface Treino {
  id?: number;
  nome: string;
  diaDaSemana?: number;
}

export interface Exercicio {
  id?: number;
  nome: string;
  tipo: 'SIMP' | 'COMP';
  tipoExecucao: TipoExecucao;
  ordem: number;
  numeroWorkSets: number;
  repeticoesMinimas: number;
  repeticoesMaximas: number;
  treinoId: number;
  observacoes?: string;
}

export interface Serie {
  id?: number;
  exercicioId: number;
  tipo: TipoSerie;
  numero: number;
  repeticoes: number;
  peso: number;
  ordem: number;
}

export type HistoricoExercicio = {
  id: number;
  exercicioId: number;
  data: Date;
  peso: number;
  repeticoes: number;
  observacoes: string;
  tipo: TipoSerie;
  ordem: number;
};

export interface Categoria {
  id?: number;
  nome: string;
  descricao?: string;
}

export interface Cardio {
  id?: number;
  treinoId: number;
  nome: string;
  duracao: number;
  intensidade: 'baixa' | 'media' | 'alta';
  data: Date;
  observacoes?: string;
}

export interface CardioHistorico {
  id?: number;
  cardioId: number;
  data: Date;
  duracao: number;
  intensidade: 'baixa' | 'media' | 'alta';
  observacoes?: string;
}

export class TreinoDatabase extends Dexie {
  treinos!: Table<Treino>;
  exercicios!: Table<Exercicio>;
  series!: Table<Serie>;
  categorias!: Table<Categoria>;
  cardio!: Table<Cardio>;
  cardioHistorico!: Table<CardioHistorico>;
  historico!: Table<HistoricoExercicio>;

  constructor() {
    super('TreinoDatabase');
    this.version(2).stores({
      treinos: '++id, nome, diaDaSemana',
      exercicios: '++id, treinoId, nome, tipoExecucao, ordem',
      series: '++id, exercicioId, tipo, numero',
      categorias: '++id',
      cardio: '++id, treinoId, nome, data',
      cardioHistorico: '++id, cardioId, data',
      historico: '++id, exercicioId, data'
    });
  }
}

export const db = new TreinoDatabase();

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