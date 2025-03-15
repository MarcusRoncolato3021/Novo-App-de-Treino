'use client';

import { useState, useEffect } from 'react';

interface TemporizadorProps {
  tempoTotal: number; // em segundos
  onComplete?: () => void;
}

export default function Temporizador({ tempoTotal, onComplete }: TemporizadorProps) {
  const [tempoRestante, setTempoRestante] = useState(tempoTotal);
  const [isAtivo, setIsAtivo] = useState(false);

  useEffect(() => {
    let intervalo: NodeJS.Timeout;

    if (isAtivo && tempoRestante > 0) {
      intervalo = setInterval(() => {
        setTempoRestante((tempo) => {
          if (tempo <= 1) {
            setIsAtivo(false);
            onComplete?.();
            return 0;
          }
          return tempo - 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalo);
  }, [isAtivo, tempoRestante, onComplete]);

  const iniciar = () => {
    setTempoRestante(tempoTotal);
    setIsAtivo(true);
  };

  const pausar = () => {
    setIsAtivo(false);
  };

  const reiniciar = () => {
    setTempoRestante(tempoTotal);
    setIsAtivo(false);
  };

  const formatarTempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;
    return `${minutos}:${segundosRestantes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-4xl font-bold">
        {formatarTempo(tempoRestante)}
      </div>
      
      <div className="flex space-x-2">
        {!isAtivo ? (
          <button
            onClick={iniciar}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Iniciar
          </button>
        ) : (
          <button
            onClick={pausar}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Pausar
          </button>
        )}
        
        <button
          onClick={reiniciar}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reiniciar
        </button>
      </div>
    </div>
  );
} 