'use client';

import Dexie from 'dexie';

export type TipoExecucao = 'COMP' | 'SIMP';
export type TipoSerie = 'WARM_UP' | 'FEEDER' | 'WORK_SET' | 'SIMPLES';

export interface Treino {
  id?: number;
  nome: string;
  diaDaSemana: number; // 0-6 (domingo-sábado)
  dataCriacao: Date;
  ultimaExecucao?: Date;
}

export interface Exercicio {
  id?: number;
  treinoId: number;
  nome: string;
  tipoExecucao: TipoExecucao;
  ordem: number;
  // Campos personalizáveis
  numeroWorkSets?: number; // Para COMP
  numeroSeries?: number; // Para SIMP
  repeticoesMinimas?: number;
  repeticoesMaximas?: number;
  observacoes?: string;
}

export interface Serie {
  id?: number;
  exercicioId: number;
  tipo: TipoSerie;
  pesoAtual: number;
  repeticoesMinimas: number;
  repeticoesMaximas: number;
  tempoDescanso: number; // em segundos
  ordem: number;
}

export interface HistoricoExercicio {
  id?: number;
  exercicioId: number;
  data: Date;
  peso: number;
  repeticoes: number;
  tipo: 'WORK_SET' | 'SIMPLES';
  observacoes?: string;
}

class TreinoDatabase extends Dexie {
  treinos!: Dexie.Table<Treino, number>;
  exercicios!: Dexie.Table<Exercicio, number>;
  series!: Dexie.Table<Serie, number>;
  historico!: Dexie.Table<HistoricoExercicio, number>;

  constructor() {
    super('TreinoDatabase');
    this.version(1).stores({
      treinos: '++id, diaDaSemana',
      exercicios: '++id, treinoId, ordem',
      series: '++id, exercicioId, ordem',
      historico: '++id, exercicioId, data'
    });
  }
}

const db = new TreinoDatabase();
export { db }; 