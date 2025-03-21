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
  treinoId: number;
  nome: string;
  tipoExecucao: TipoExecucao;
  ordem: number;
  numeroWorkSets: number;
  repeticoesMinimas: number;
  repeticoesMaximas: number;
  observacoes?: string;
}

export interface Serie {
  id?: number;
  exercicioId: number;
  tipo: TipoSerie;
  numero: number;
  repeticoes: number;
  peso: number;
}

export interface HistoricoExercicio {
  id?: number;
  exercicioId: number;
  data: Date;
  peso: number;
  repeticoes: number;
  observacoes?: string;
}

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
    this.version(1).stores({
      treinos: '++id, nome, diaDaSemana',
      exercicios: '++id, treinoId, nome, tipoExecucao, ordem',
      series: '++id, exercicioId, tipo, numero',
      categorias: '++id',
      cardio: '++id, treinoId, data',
      cardioHistorico: '++id, cardioId, data',
      historico: '++id, exercicioId, data'
    });
  }
}

export const db = new TreinoDatabase();

// Inicializar o banco de dados com tratamento de erro
try {
  db.open().catch((err) => {
    console.error("Erro ao abrir o banco de dados:", err);
    alert("Erro ao inicializar o banco de dados. Por favor, recarregue a página.");
  });
} catch (error) {
  console.error("Erro ao inicializar o banco de dados:", error);
  alert("Erro ao inicializar o banco de dados. Por favor, recarregue a página.");
} 