'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';

export default function HistoricoCardio() {
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [datesExpanded, setDatesExpanded] = useState<Record<string, boolean>>({});

  const historicoCardio = useLiveQuery(
    () => db.cardio
      .orderBy('data')
      .reverse()
      .toArray()
  );

  const formatarDataDDMMYY = (data: Date) => {
    return data.toLocaleDateString('pt-BR');
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const exerciciosPorData = historicoCardio?.reduce((acc, exercicio) => {
    const data = formatarDataDDMMYY(exercicio.data);
    if (!acc[data]) {
      acc[data] = [];
    }
    acc[data].push(exercicio);
    return acc;
  }, {} as Record<string, typeof historicoCardio>) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-4 pb-2 px-6 bg-white backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-center max-w-5xl mx-auto">
          <Link href="/cardio" className="absolute left-6 -ml-2">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
          </Link>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 -mt-1">
            Histórico de Cardio
          </h1>
        </div>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto">
        {Object.entries(exerciciosPorData).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(exerciciosPorData).map(([data, exercicios]) => (
              <div key={data} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleDate(data)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-800">{data}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm('Deseja excluir todos os exercícios desta data?')) {
                          const ids = exercicios.map(ex => ex.id).filter(id => id !== undefined);
                          await Promise.all(ids.map(id => db.cardio.delete(id)));
                        }
                      }}
                      className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                        expandedDates.includes(data) ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedDates.includes(data) && (
                  <div className="divide-y divide-gray-100">
                    {exercicios.map((exercicio) => (
                      <div key={exercicio.id} className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-medium text-gray-800">{exercicio.tipo}</h3>
                          </div>

                          <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                              {exercicio.duracao} minutos
                            </span>
                          </div>

                          {exercicio.observacoes && (
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">
                                {exercicio.observacoes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhum exercício registrado ainda</p>
            <Link
              href="/cardio"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors duration-200"
            >
              Registrar exercício
            </Link>
          </div>
        )}
      </main>
    </div>
  );
} 
