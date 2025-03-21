'use client';

import React, { useState, Suspense } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Exercicio } from '@/lib/db';

const diasDaSemana = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

interface EditarCargasModalProps {
  exercicio: Exercicio;
  onClose: () => void;
}

function TreinosContent() {
  const searchParams = useSearchParams();
  const categoria = searchParams.get('categoria') || 'superiores';
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExercicio, setSelectedExercicio] = useState<Exercicio | null>(null);

  const treinos = useLiveQuery(
    () => db.treinos.where('categoria').equals(categoria).toArray()
  );

  const exercicios = useLiveQuery(
    () => db.exercicios.where('treinoId').anyOf(treinos?.map(t => t.id!) || []).toArray(),
    [treinos]
  );

  const getTituloCategoria = () => {
    switch (categoria) {
      case 'superiores':
        return 'Treinos de Superiores';
      case 'inferiores':
        return 'Treinos de Inferiores';
      default:
        return 'Treinos';
    }
  };

  const getExerciciosTreino = (treinoId: number) => {
    return exercicios?.filter(e => e.treinoId === treinoId) || [];
  };

  const EditarCargasModal = ({ exercicio, onClose }: EditarCargasModalProps) => {
    if (!exercicio) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{exercicio.nome}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warm-up</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                defaultValue="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feeder Sets</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                defaultValue="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Sets</label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                defaultValue="0"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                // Salvar alterações
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen font-sans pb-24">
      <header className="pt-12 pb-4 px-6">
        <div className="flex items-center mb-6">
          <Link href="/" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-primary-800">{getTituloCategoria()}</h1>
        </div>
      </header>

      <main className="px-6">
        {treinos?.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-gray-600 mb-4">Nenhum treino registrado nesta categoria</p>
            <Link
              href="/"
              className="inline-block bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300"
            >
              Adicionar novo treino
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {treinos?.map((treino) => (
              <Link
                key={treino.id}
                href={`/treino/${treino.id}`}
                className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center mb-3">
                  <div className="bg-primary-100 rounded-lg p-3 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-lg text-gray-800">{treino.nome}</h2>
                    <p className="text-sm text-gray-500">
                      {treino.diaDaSemana !== undefined && treino.diaDaSemana >= 0 && treino.diaDaSemana < diasDaSemana.length 
                        ? diasDaSemana[treino.diaDaSemana] 
                        : 'Dia não definido'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {getExerciciosTreino(treino.id!).map((exercicio, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-800">{exercicio.nome}</h3>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedExercicio(exercicio);
                            setModalOpen(true);
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">Cargas:</span>
                          <span className="font-medium text-gray-800">0/0/0</span>
                          <span className="text-gray-500">kg</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-500">Meta:</span>
                          <span className="font-medium text-gray-800">
                            {exercicio.repeticoesMinimas}-{exercicio.repeticoesMaximas}
                          </span>
                          <span className="text-gray-500">reps</span>
                        </div>
                      </div>

                      {exercicio.tipoExecucao !== 'SIMP' && (
                        <div className="mt-2">
                          <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
                            {exercicio.tipoExecucao}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {modalOpen && selectedExercicio && (
        <EditarCargasModal
          exercicio={selectedExercicio}
          onClose={() => {
            setModalOpen(false);
            setSelectedExercicio(null);
          }}
        />
      )}
    </div>
  );
}

export default function TreinosPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <TreinosContent />
    </Suspense>
  );
} 