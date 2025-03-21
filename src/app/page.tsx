'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';

interface Treino {
  id?: number;
  nome: string;
  diaDaSemana: number;
}

const diasDaSemana = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
] as const;

const categorias = [
  { nome: 'Cardio', cor: 'red', icone: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { nome: 'Superiores', cor: 'purple', icone: 'M47.923,29.694c0.021-0.601-0.516-1.063-0.901-1.515c-0.676-2.733-2.016-5.864-3.961-8.971C39.942,14.23,31.688,6.204,28.553,4.966c-0.158-0.062-0.299-0.097-0.429-0.126c-0.313-1.013-0.479-1.708-1.698-2.521c-3.354-2.236-7.099-2.866-9.578-1.843c-2.481,1.023-3.859,6.687-1.19,8.625c2.546,1.857,7.583-1.888,9.195,0.509c1.609,2.396,3.386,10.374,6.338,15.473c-0.746-0.102-1.514-0.156-2.307-0.156c-3.406,0-6.467,0.998-8.63,2.593c-1.85-2.887-5.08-4.806-8.764-4.806c-3.82,0-7.141,2.064-8.95,5.13v22.619h4.879l1.042-1.849c3.354-1.287,7.32-4.607,10.076-8.147C29.551,44.789,47.676,36.789,47.923,29.694z' },
  { nome: 'Inferiores', cor: 'blue', icone: 'M20.27 122.41c-1.11 0-2.16-.34-3.2-1.05c-.73-.5-1.16-1.2-1.21-1.98c-.08-1.28.87-2.19 1.06-2.36c.08-.07.16-.13.25-.18c0 0 4.45-2.58 5.6-3.23c.86-.49 2.53-1.78 4.47-3.26c2.47-1.9 5.55-4.26 8.53-6.21c3.5-2.29 4.91-3.98 6.31-7.54c.88-2.23.18-12.29-.5-22.03c-.74-10.7-1.58-22.81-.86-30.16c-.16-1.12-.34-2.16-.51-3.15c-.84-4.83-1.5-8.64 1.36-13.44a9.342 9.342 0 0 1 4.36-3.84c15.63-6.71 42.78-16.14 50.2-16.95c2.17-.24 4.08-.35 5.82-.35c6.54 0 15.51 1.45 17.83 14.02c.52 2.79 1.27 9.91-2.85 15.7c-2.6 3.66-6.55 5.91-11.74 6.7c-5.36 1.15-15.66 1.65-25.61 2.14c-5.2.25-10.15.5-13.92.82c6.48 14.6.27 26.75-3.9 34.91l-.48.95c-2.21 4.34-4.64 14.03-3.13 21.96c.07.38.18.82.29 1.3c.79 3.38 2.27 9.67-3.25 12.08c-1.85.8-3.48 1.15-5.46 1.15c-.78 0-1.56-.05-2.39-.1c-.54-.04-1.11-.07-1.73-.1c-.78-.03-1.47-.09-2.11-.14c-.73-.06-1.36-.11-1.96-.11c-.95 0-2.06.11-3.77.93c-.56.27-1.08.53-1.57.79c-1.53.79-2.98 1.54-5.01 1.9c-.3.05-.62.08-.95.08c-1.67 0-3.4-.69-4.54-1.25c-.52.55-1.29 1.11-2.4 1.43l-.39.11c-.82.21-1.68.46-2.64.46z' }
];

export default function Home() {
  const [novoTreinoNome, setNovoTreinoNome] = useState('');
  const [diaSelecionado, setDiaSelecionado] = useState(1);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  const treinos = useLiveQuery(
    () => db.treinos.orderBy('diaDaSemana').toArray()
  );

  const abrirModal = () => {
    setModalAberto(true);
  };

  const adicionarTreino = async () => {
    if (!novoTreinoNome.trim()) {
      alert('Por favor, insira um nome para o treino.');
      return;
    }

    try {
      const novoTreino = {
        nome: novoTreinoNome,
        diaDaSemana: diaSelecionado
      };

      await db.treinos.add(novoTreino);
      setNovoTreinoNome('');
      setModalAberto(false);
    } catch (error) {
      console.error('Erro ao adicionar treino:', error);
      alert('Erro ao adicionar treino. Tente novamente.');
    }
  };

  const excluirTreino = async (treinoId: number) => {
    if (!confirm('Tem certeza que deseja excluir este treino? Todos os exercícios e histórico serão perdidos.')) {
      return;
    }

    const exercicios = await db.exercicios
      .where('treinoId')
      .equals(treinoId)
      .toArray();

    for (const exercicio of exercicios) {
      if (exercicio.id) {
        await db.series.where('exercicioId').equals(exercicio.id).delete();
        await db.historico.where('exercicioId').equals(exercicio.id).delete();
      }
    }

    await db.exercicios.where('treinoId').equals(treinoId).delete();
    await db.treinos.delete(treinoId);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen font-sans pb-24">
      <header className="pt-12 pb-4 px-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary-800">Diário de Treino</h1>
          <div className="flex space-x-2">
            <button className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar treinos, exercícios..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full py-2 pl-10 pr-4 rounded-xl bg-white shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300"
          />
        </div>
      </header>

      <section className="px-6 py-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Seu treino de hoje
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({diasDaSemana[new Date().getDay() % 7]})
          </span>
        </h2>
        {treinos && treinos.filter(t => t.diaDaSemana === new Date().getDay()).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 text-center">
            <p className="text-gray-600">Nenhum treino programado para hoje</p>
            <button 
              onClick={() => {
                setDiaSelecionado(new Date().getDay());
                setNovoTreinoNome('');
              }}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300 transform hover:scale-105"
            >
              Adicionar treino para hoje
            </button>
          </div>
        ) : (
          treinos && treinos.filter(t => t.diaDaSemana === new Date().getDay()).map((treino) => (
            <Link
              key={treino.id}
              href={`/treino/${treino.id}`}
              className="bg-white rounded-2xl shadow-md p-4 mb-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 block"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-primary-700">{treino.nome}</h3>
                <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-lg text-sm font-medium">
                  {diasDaSemana[(treino.diaDaSemana || 0) % 7]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-primary-600 rounded-full"></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-600">75% concluído</span>
                </div>
                <button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300 transform hover:scale-105">
                  Iniciar treino
                </button>
              </div>
            </Link>
          ))
        )}
      </section>

      <section className="px-6 py-2">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Categorias</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {categorias.map((categoria) => (
            <Link
              key={categoria.nome}
              href={categoria.nome === 'Cardio' ? '/cardio' : `/treinos?categoria=${categoria.nome.toLowerCase()}`}
              className="flex flex-col items-center min-w-[80px] hover:transform hover:scale-110 transition-all duration-300"
            >
              <div className={`bg-${categoria.cor}-100 rounded-full p-3 mb-2`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-10 w-10 text-${categoria.cor}-600`} 
                  viewBox={categoria.nome === 'Cardio' ? '0 0 24 24' : categoria.nome === 'Superiores' ? '0 0 50.463 50.463' : '0 0 150 150'}
                  fill="currentColor"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path d={categoria.icone} />
                </svg>
              </div>
              <span className="text-sm font-medium">{categoria.nome}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Seus treinos</h2>
          <button className="text-primary-600 font-medium hover:text-primary-800 transition-colors duration-300">
            Ver todos
          </button>
        </div>
        <div className="space-y-4">
          {treinos && treinos.map((treino) => (
            <Link
              key={treino.id}
              href={`/treino/${treino.id}`}
              className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center">
                <div className="bg-primary-100 rounded-lg p-3 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{treino.nome}</h3>
                  <p className="text-sm text-gray-500">{diasDaSemana[(treino.diaDaSemana || 0) % 7]}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      treino.id && excluirTreino(treino.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Modal de Novo Treino */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Novo Treino</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Treino
                </label>
                <input
                  type="text"
                  value={novoTreinoNome}
                  onChange={(e) => setNovoTreinoNome(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Treino A - Superiores"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dia da Semana
                </label>
                <select
                  value={diaSelecionado}
                  onChange={(e) => setDiaSelecionado(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {diasDaSemana.map((dia, index) => (
                    <option key={index} value={index}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarTreino}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 max-w-[390px] mx-auto z-10">
        <div className="flex justify-around items-center">
          <button className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium text-primary-600">Início</span>
          </button>
          <button className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Progresso</span>
          </button>
          <button
            onClick={abrirModal}
            className="flex flex-col items-center justify-center p-2 -mt-5 bg-primary-600 rounded-full w-16 h-16 hover:bg-primary-700 transition-colors duration-300 transform hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Agenda</span>
          </button>
          <button className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}