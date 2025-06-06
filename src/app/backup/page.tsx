'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  manualBackup, 
  getBackupsList, 
  restoreBackup, 
  deleteBackup,
  exportDatabaseData,
  BACKUP_PREFIX,
  exportEssentialBackupData,
  BackupData
} from '@/lib/backup';
import { toast } from 'react-hot-toast';
import { FotoProgresso, RelatorioSemanal } from '@/lib/db';
import Navbar from '@/components/Navbar';

// Definição da animação de fadeIn
const fadeInAnimation = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
`;

export default function BackupPage() {
  const [backups, setBackups] = useState<Array<{key: string, date: Date, size: string, isParcial: boolean}>>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [showInfoText, setShowInfoText] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isCreatingEssentialBackup, setIsCreatingEssentialBackup] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isExportingEssentialBackup, setIsExportingEssentialBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Carregar lista de backups
  const loadBackups = () => {
    try {
      const backupsList = getBackupsList();
      setBackups(backupsList);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      toast.error('Erro ao carregar backups');
    }
  };

  // Inicializar a página
  useEffect(() => {
    loadBackups();
  }, []);

  // Criar um novo backup
  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setAction("Criando backup...");
      
      const backupKey = await manualBackup();
      
      // Verificar se o backup foi parcial
      if (localStorage.getItem(`${backupKey}_isParcial`) === 'true') {
        toast.success('Backup criado com sucesso, mas algumas imagens foram omitidas devido ao tamanho do backup.');
      } else if (localStorage.getItem(`${backupKey}_isEmergency`) === 'true') {
        toast.success('Backup de emergência criado. Imagens não foram incluídas devido a limitações de espaço.');
      } else {
        toast.success('Backup criado com sucesso!');
      }
      
      // Recarregar a lista de backups
      loadBackups();
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      toast.error('Erro ao criar backup');
    } finally {
      setIsCreatingBackup(false);
      setAction(null);
    }
  };

  // Criar backup essencial (sem imagens)
  const createEssentialBackup = async () => {
    setIsCreatingEssentialBackup(true);
    setAction("Criando backup essencial...");
    try {
      // Usar a função de backup essencial importada
      const data = await exportEssentialBackupData();
      
      // Salvar o backup no localStorage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `${BACKUP_PREFIX}${timestamp}`;
      const dataString = JSON.stringify(data);
      
      localStorage.setItem(backupKey, dataString);
      localStorage.setItem(`${backupKey}_isParcial`, 'true');
      
      // Remover backups antigos se necessário
      const keys = getBackupsList().map(backup => backup.key);
      if (keys.length > 10) {
        const keysToRemove = keys.slice(0, keys.length - 10);
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      toast.success('Backup essencial criado com sucesso!');
      loadBackups();
    } catch (error) {
      console.error('Erro ao criar backup essencial:', error);
      toast.error('Erro ao criar backup essencial. Verifique o console para mais detalhes.');
    } finally {
      setIsCreatingEssentialBackup(false);
      setAction(null);
    }
  };

  // Restaurar um backup
  const handleRestoreBackup = async (key: string) => {
    if (!confirm('Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.')) {
      return;
    }

    try {
      setIsRestoring(true);
      setAction("loading");
      
      await restoreBackup(key);
      toast.success('Backup restaurado com sucesso!');
      
      // Recarregar a lista de backups
      loadBackups();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setIsRestoring(false);
      setAction(null);
    }
  };

  // Excluir um backup
  const handleDeleteBackup = async (key: string) => {
    if (!confirm('Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setAction("loading");
      
      const success = deleteBackup(key);
      if (success) {
        toast.success('Backup excluído com sucesso!');
      } else {
        toast.error('Erro ao excluir backup');
      }
      
      // Recarregar a lista de backups
      loadBackups();
    } catch (error) {
      console.error('Erro ao excluir backup:', error);
      toast.error('Erro ao excluir backup');
    } finally {
      setIsDeleting(false);
      setAction(null);
    }
  };

  // Exportar backup como arquivo
  const handleExportBackup = () => {
    if (backups.length === 0) {
      toast.error('Nenhum backup disponível para exportar');
      return;
    }
    
    try {
      setIsExportingBackup(true);
      
      // Usar o backup mais recente
      const backupKey = backups[backups.length - 1].key;
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        toast.error('Backup não encontrado');
        return;
      }

      // Criar um objeto Blob com os dados
      const blob = new Blob([backupData], { type: 'application/json' });
      
      // Criar URL para download
      const url = URL.createObjectURL(blob);
      
      // Criar elemento <a> para download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backupKey}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      toast.error('Erro ao exportar backup');
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Exportar apenas dados essenciais (sem imagens)
  const handleExportEssentialBackup = async () => {
    try {
      setIsExportingEssentialBackup(true);
      setAction("exporting");
      
      // Obter o backup mais recente
      const backupsList = getBackupsList();
      if (backupsList.length === 0) {
        toast.error('Nenhum backup disponível');
        return;
      }
      
      // Usar o backup mais recente
      const backupKey = backupsList[backupsList.length - 1].key;
      const backupStr = localStorage.getItem(backupKey);
      
      if (!backupStr) {
        toast.error('Erro ao ler backup');
        return;
      }
      
      // Converter backup para objeto
      const backupData = JSON.parse(backupStr);
      
      // Remover todas as imagens para garantir um backup mínimo
      const essentialBackup = {
        ...backupData,
        fotosProgresso: backupData.fotosProgresso?.map((item: any) => ({
          ...item,
          frente: null,
          costas: null,
          lateralEsquerda: null,
          lateralDireita: null
        })) || [],
        fotos: [],
        relatorios: backupData.relatorios?.map((item: any) => ({
          ...item,
          fotos: []
        })) || []
      };
      
      // Criar arquivo para download
      const essentialStr = JSON.stringify(essentialBackup);
      const blob = new Blob([essentialStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Criar elemento <a> para download
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_essencial_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpar
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Backup essencial (sem imagens) exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar backup essencial:', error);
      toast.error('Erro ao exportar backup essencial');
    } finally {
      setIsExportingEssentialBackup(false);
      setAction(null);
    }
  };

  useEffect(() => {
    // Adiciona o estilo de animação ao head
    const style = document.createElement('style');
    style.innerHTML = fadeInAnimation;
    document.head.appendChild(style);
    
    return () => {
      // Remove o estilo quando o componente for desmontado
      document.head.removeChild(style);
    };
  }, []);

  // Loading spinner comum para todos os botões
  const LoadingSpinner = () => (
    <div className="h-5 w-5 border-2 border-gray-200 border-t-white rounded-full animate-spin mr-2"></div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <style jsx global>{fadeInAnimation}</style>
      
      <header className="pt-4 pb-2 px-6 bg-white backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center max-w-5xl mx-auto">
          <div className="absolute left-0 -ml-2">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
          </div>

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 -mt-1">
            Backup e Restauração
          </h1>
        </div>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Seção de informações (colapsável) */}
        <div className="bg-white rounded-lg shadow-md p-5 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Gerenciar Backups</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna de criação */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Criar</h3>
              <button
                className={`w-full h-12 rounded-lg font-medium ${
                  isCreatingBackup ? 'bg-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'
                } flex justify-center items-center transition-colors`}
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
              >
                {isCreatingBackup ? (
                  <>
                    <LoadingSpinner />
                    Criando...
                  </>
                ) : (
                  'Backup Completo'
                )}
              </button>
              
              <button
                className={`w-full h-12 rounded-lg font-medium ${
                  isCreatingEssentialBackup ? 'bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'
                } flex justify-center items-center transition-colors`}
                onClick={createEssentialBackup}
                disabled={isCreatingEssentialBackup}
              >
                {isCreatingEssentialBackup ? (
                  <>
                    <LoadingSpinner />
                    Criando...
                  </>
                ) : (
                  'Backup Essencial'
                )}
              </button>
            </div>

            {/* Coluna de exportação */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Exportar</h3>
              <button
                className={`w-full h-12 rounded-lg font-medium ${
                  isExportingBackup || backups.length === 0 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } flex justify-center items-center transition-colors`}
                onClick={handleExportBackup}
                disabled={isExportingBackup || backups.length === 0}
              >
                {isExportingBackup ? (
                  <>
                    <LoadingSpinner />
                    Exportando...
                  </>
                ) : (
                  'Backup Completo'
                )}
              </button>
              
              <button
                className={`w-full h-12 rounded-lg font-medium ${
                  isExportingEssentialBackup || backups.length === 0 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                } flex justify-center items-center transition-colors`}
                onClick={handleExportEssentialBackup}
                disabled={isExportingEssentialBackup || backups.length === 0}
              >
                {isExportingEssentialBackup ? (
                  <>
                    <LoadingSpinner />
                    Exportando...
                  </>
                ) : (
                  'Backup Essencial'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de backups */}
        <div className="bg-white rounded-lg shadow-md p-5 animate-fadeIn">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Backups Disponíveis</h2>
          {backups.length === 0 ? (
            <p className="text-gray-500 italic text-center py-4">Nenhum backup disponível.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{backup.date.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{backup.size}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-3">
                          <button
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              isRestoring ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            } transition-colors`}
                            onClick={() => handleRestoreBackup(backup.key)}
                            disabled={isRestoring}
                          >
                            Restaurar
                          </button>
                          <button
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              isDeleting ? 'bg-gray-200 text-gray-500' : 'bg-red-100 text-red-700 hover:bg-red-200'
                            } transition-colors`}
                            onClick={() => handleDeleteBackup(backup.key)}
                            disabled={isDeleting}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="h-10 w-10 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-700">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      <Navbar />
    </div>
  );
} 