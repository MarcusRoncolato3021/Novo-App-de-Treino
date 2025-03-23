export type Exercicio = {
  id?: number;
  nome: string;
  tipo: 'SIMP' | 'COMP';
  repeticoesMinimas: number;
  repeticoesMaximas: number;
  treinoId: number;
  ordem?: number;
}; 