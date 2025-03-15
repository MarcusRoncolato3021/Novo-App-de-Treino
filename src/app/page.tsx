'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';

const diasDaSemana = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const categorias = [
  { nome: 'Cardio', cor: 'red', icone: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { nome: 'Pernas', cor: 'blue', icone: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { nome: 'Braços', cor: 'purple', icone: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
  { nome: 'Costas', cor: 'green', icone: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { nome: 'Abdômen', cor: 'yellow', icone: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
];

export default function Home() {
  const [novoTreinoNome, setNovoTreinoNome] = useState('');
  const [diaSelecionado, setDiaSelecionado] = useState(new Date().getDay());
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  const treinos = useLiveQuery(
    () => db.treinos.orderBy('diaDaSemana').toArray()
  );

  const adicionarTreino = async () => {
    if (!novoTreinoNome.trim()) {
      alert('Por favor, insira um nome para o treino.');
      return;
    }

    const novoTreino = {
      nome: novoTreinoNome,
      diaDaSemana: diaSelecionado,
      dataCriacao: new Date()
    };

    await db.treinos.add(novoTreino);
    setNovoTreinoNome('');
    setModalAberto(false);
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
            ({diasDaSemana[new Date().getDay()]})
          </span>
        </h2>
        {treinos?.filter(t => t.diaDaSemana === new Date().getDay()).length === 0 ? (
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
          treinos?.filter(t => t.diaDaSemana === new Date().getDay()).map((treino) => (
            <Link
              key={treino.id}
              href={`/treino/${treino.id}`}
              className="bg-white rounded-2xl shadow-md p-4 mb-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 block"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-primary-700">{treino.nome}</h3>
                <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-lg text-sm font-medium">
                  {diasDaSemana[treino.diaDaSemana]}
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
            <div key={categoria.nome} className="flex flex-col items-center min-w-[80px] hover:transform hover:scale-110 transition-all duration-300">
              <div className={`bg-${categoria.cor}-100 rounded-full p-4 mb-2`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 text-${categoria.cor}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoria.icone} />
                </svg>
              </div>
              <span className="text-sm font-medium">{categoria.nome}</span>
            </div>
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
          {treinos?.map((treino) => (
            <div key={treino.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center hover:shadow-md transition-all duration-300">
              <div className="bg-primary-100 rounded-lg p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{treino.nome}</h3>
                <p className="text-sm text-gray-500">{diasDaSemana[treino.diaDaSemana]}</p>
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
                <Link href={`/treino/${treino.id}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal de Novo Treino */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Novo Treino</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="nomeTreino" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Treino
                </label>
                <input
                  type="text"
                  id="nomeTreino"
                  value={novoTreinoNome}
                  onChange={(e) => setNovoTreinoNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Treino A, Superiores, etc."
                />
              </div>
              <div>
                <label htmlFor="diaTreino" className="block text-sm font-medium text-gray-700 mb-1">
                  Dia da Semana
                </label>
                <select
                  id="diaTreino"
                  value={diaSelecionado}
                  onChange={(e) => setDiaSelecionado(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {diasDaSemana.map((dia, index) => (
                    <option key={index} value={index}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarTreino}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-300"
                >
                  Salvar
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
            onClick={() => setModalAberto(true)}
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