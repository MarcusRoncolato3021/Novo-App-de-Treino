'use client';

import React, { useState, useRef } from 'react';
import { db, Foto } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

const tiposFoto = [
  { id: 'frente', nome: 'Frente', icone: '👤' },
  { id: 'lado', nome: 'Lado', icone: '👤' },
  { id: 'costas', nome: 'Costas', icone: '👤' }
];

export default function Comparacao() {
  const [tipoSelecionado, setTipoSelecionado] = useState<'frente' | 'costas' | 'lado'>('frente');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Buscar fotos existentes
  const fotos = useLiveQuery(
    async () => {
      const todasFotos = await db.fotos.toArray();
      return todasFotos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }
  );

  const iniciarCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const pararCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraOpen(false);
    }
  };

  const tirarFoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    
    const fotoUrl = canvas.toDataURL('image/jpeg');
    setPreviewUrl(fotoUrl);
    pararCamera();
  };

  const salvarFoto = async () => {
    if (!previewUrl) return;

    try {
      const novaFoto: Foto = {
        data: new Date(),
        tipo: tipoSelecionado as "frente" | "costas" | "lado_esquerdo" | "lado_direito",
        url: previewUrl
      };

      await db.fotos.add(novaFoto);
      setPreviewUrl(null);
      alert('Foto salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
      alert('Erro ao salvar a foto. Tente novamente.');
    }
  };

  const excluirFoto = async (fotoId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

    try {
      await db.fotos.delete(fotoId);
      alert('Foto excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir foto:', error);
      alert('Erro ao excluir a foto. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-primary-800 mb-2">Comparação de Fotos</h1>
        <p className="text-gray-600">Registre e compare sua evolução</p>
      </header>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Foto
          </label>
          <div className="flex space-x-4">
            {tiposFoto.map(tipo => (
              <button
                key={tipo.id}
                onClick={() => setTipoSelecionado(tipo.id as 'frente' | 'costas' | 'lado')}
                className={`flex items-center px-4 py-2 rounded-lg ${
                  tipoSelecionado === tipo.id
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <span className="mr-2">{tipo.icone}</span>
                {tipo.nome}
              </button>
            ))}
          </div>
        </div>

        {!isCameraOpen && !previewUrl && (
          <button
            onClick={iniciarCamera}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300"
          >
            Tirar Nova Foto
          </button>
        )}

        {isCameraOpen && (
          <div className="space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
            />
            <div className="flex space-x-4">
              <button
                onClick={tirarFoto}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300"
              >
                Capturar
              </button>
              <button
                onClick={pararCamera}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors duration-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {previewUrl && (
          <div className="space-y-4">
            <img
              src={previewUrl}
              alt="Preview da foto"
              className="w-full rounded-lg"
            />
            <div className="flex space-x-4">
              <button
                onClick={salvarFoto}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors duration-300"
              >
                Salvar
              </button>
              <button
                onClick={() => setPreviewUrl(null)}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors duration-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Suas Fotos</h2>
        {fotos?.map(foto => (
          <div key={foto.id} className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {new Date(foto.data).toLocaleDateString('pt-BR')}
                </span>
                <span className="ml-2 text-sm font-medium text-primary-600">
                  {tiposFoto.find(t => t.id === foto.tipo)?.nome}
                </span>
              </div>
              <button
                onClick={() => foto.id && excluirFoto(foto.id)}
                className="text-red-500 hover:text-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <img
              src={foto.url}
              alt={`Foto ${foto.tipo}`}
              className="w-full h-auto rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
} 
