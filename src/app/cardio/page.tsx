'use client';

import React, { useState } from 'react';
import { db, Cardio } from '@/lib/db';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';

export default function CardioPage() {
  const [exercicio, setExercicio] = useState('');
  const [duracao, setDuracao] = useState('');
  const [nivelBike, setNivelBike] = useState('');
  const [intensidade, setIntensidade] = useState<'baixa' | 'media' | 'alta'>('media');
  const [carregando, setCarregando] = useState(false);

  const router = useRouter();

  const historicoRecente = useLiveQuery<Cardio[]>(
    () => db.cardio.orderBy('data').reverse().limit(5).toArray()
  ) || [];

  const tiposExercicios = [
    'Corrida',
    'Caminhada',
    'Ciclismo',
    'Natação',
    'Pular corda',
    'Elíptico',
    'Escada',
    'Bike',
    'Outro'
  ];

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR');
  };

  const salvarExercicio = async () => {
    if (!exercicio || !duracao) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    if (exercicio === 'Bike' && !nivelBike) {
      alert('Por favor, insira o nível da bike');
      return;
    }

    try {
      setCarregando(true);
      const novoExercicio: Cardio = {
        tipo: exercicio,
        duracao: parseInt(duracao),
        data: new Date(),
        intensidade: intensidade === 'baixa' ? 1 : intensidade === 'media' ? 2 : 3,
        observacoes: exercicio === 'Bike' ? `Nível ${nivelBike}` : ''
      };

      await db.cardio.add(novoExercicio);

      alert('Exercício salvo com sucesso!');
      setExercicio('');
      setDuracao('');
      setNivelBike('');
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      alert('Erro ao salvar exercício. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const irParaHistorico = () => {
    router.push('/cardio/historico');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-4 pb-2 px-6 bg-white backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center max-w-5xl mx-auto">
          <div className="absolute left-0">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
          </div>

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
            Exercício Cardio
          </h1>

          <div className="absolute right-0">
            <Link href="/cardio/historico" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <div className="max-w-md mx-auto space-y-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="exercicio" className="block text-base font-semibold text-gray-800 mb-2">
                  Tipo de Exercício
                </label>
                <select
                  id="exercicio"
                  value={exercicio}
                  onChange={(e) => setExercicio(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 text-gray-800"
                >
                  <option value="">Selecione um exercício</option>
                  {tiposExercicios.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="duracao" className="block text-base font-semibold text-gray-800 mb-2">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  id="duracao"
                  value={duracao}
                  onChange={(e) => setDuracao(e.target.value)}
                  className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 text-gray-800"
                  placeholder="Ex: 30"
                />
              </div>

              {exercicio === 'Bike' && (
                <div>
                  <label htmlFor="nivelBike" className="block text-base font-semibold text-gray-800 mb-2">
                    Nível da Bike
                  </label>
                  <input
                    type="number"
                    id="nivelBike"
                    value={nivelBike}
                    onChange={(e) => setNivelBike(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 text-gray-800"
                    placeholder="Ex: 8"
                  />
                </div>
              )}

              <div>
                <label className="block text-base font-semibold text-gray-800 mb-2">
                  Intensidade
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setIntensidade('baixa')}
                    className={`p-4 rounded-xl font-medium transition-all duration-200 ${
                      intensidade === 'baixa'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Baixa
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntensidade('media')}
                    className={`p-4 rounded-xl font-medium transition-all duration-200 ${
                      intensidade === 'media'
                        ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Média
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntensidade('alta')}
                    className={`p-4 rounded-xl font-medium transition-all duration-200 ${
                      intensidade === 'alta'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Alta
                  </button>
                </div>
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={irParaHistorico}
                  className="w-48 flex justify-center items-center py-3 px-4 border border-blue-500 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Histórico
                </button>

                <button
                  onClick={salvarExercicio}
                  disabled={carregando}
                  className="w-48 flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {historicoRecente.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center">
                    <h2 className="text-lg font-semibold text-gray-800">Histórico Recente</h2>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {historicoRecente.map((exercicio) => (
                  <div key={exercicio.id} className="p-4">
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">{formatarData(exercicio.data)}</span>
                          <button
                            onClick={async () => {
                              if (exercicio.id && window.confirm('Deseja excluir este exercício?')) {
                                await db.cardio.delete(exercicio.id);
                              }
                            }}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Comparação</span>
          </Link>
          <Link href="/relatorio" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Relatório</span>
          </Link>
        </div>
      </nav>
    </div>
  );
} 