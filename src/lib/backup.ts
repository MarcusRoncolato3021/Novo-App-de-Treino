'use client';

import { db, Treino, Exercicio, Serie, HistoricoExercicio, Cardio, FotoProgresso, HistoricoTreino, Foto, RelatorioSemanal } from './db';

// Configurações do backup
const BACKUP_INTERVAL_DAYS = 1; // Intervalo entre backups (em dias)
const MAX_BACKUPS = 3; // Número máximo de backups a manter
export const BACKUP_PREFIX = 'appTreinoBackup_'; // Prefixo para chaves de backup
const LAST_BACKUP_DATE_KEY = 'appTreinoLastBackupDate';

// Interface para armazenar metadados de backup
interface BackupMetadata {
  date: string;
  size: number;
  tables: string[];
  essential?: boolean;
}

// Interface para o objeto completo de backup
export interface BackupData {
  metadata: BackupMetadata;
  treinos: Treino[];
  exercicios: Exercicio[];
  series: Serie[];
  historico: HistoricoExercicio[];
  cardio: Cardio[];
  fotosProgresso: FotoProgresso[];
  historicoTreinos: HistoricoTreino[];
  fotos: Foto[];
  relatorios: RelatorioSemanal[];
}

// Função para comprimir imagens base64
const compressImageBase64 = async (base64Image: string | null): Promise<string | null> => {
  if (!base64Image) return null;
  
  // Comprimir todas as imagens, não apenas as grandes
  try {
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Reduzir as dimensões máximas para economizar espaço
        const MAX_WIDTH = 500;  // Reduzido de 800 para 500
        const MAX_HEIGHT = 500; // Reduzido de 800 para 500
        let width = img.width;
        let height = img.height;

        // Redimensionar mantendo a proporção
        if (width > height && width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Comprimir com qualidade mais reduzida (0.5 em vez de 0.7)
        const compressedImage = canvas.toDataURL('image/jpeg', 0.5);
        resolve(compressedImage);
      };
      img.src = base64Image;
    });
  } catch (error) {
    console.warn('Erro ao comprimir imagem:', error);
    return base64Image; // Retorna a original em caso de erro
  }
};

// Comprime dados de fotos para economizar espaço
const compressBackupData = async (data: BackupData): Promise<BackupData> => {
  // Comprimir imagens em fotosProgresso
  if (data.fotosProgresso && data.fotosProgresso.length > 0) {
    for (let i = 0; i < data.fotosProgresso.length; i++) {
      const foto = data.fotosProgresso[i];
      foto.frente = await compressImageBase64(foto.frente);
      foto.costas = await compressImageBase64(foto.costas);
      foto.lateralEsquerda = await compressImageBase64(foto.lateralEsquerda);
      foto.lateralDireita = await compressImageBase64(foto.lateralDireita);
    }
  }
  
  // Comprimir imagens em fotos
  if (data.fotos && data.fotos.length > 0) {
    for (let i = 0; i < data.fotos.length; i++) {
      const foto = data.fotos[i];
      foto.url = await compressImageBase64(foto.url) || '';
    }
  }
  
  // Comprimir imagens em relatórios
  if (data.relatorios && data.relatorios.length > 0) {
    for (let i = 0; i < data.relatorios.length; i++) {
      const relatorio = data.relatorios[i];
      if (relatorio.fotos && relatorio.fotos.length > 0) {
        const compressedFotos: string[] = [];
        for (const foto of relatorio.fotos) {
          const compressed = await compressImageBase64(foto);
          if (compressed) compressedFotos.push(compressed);
        }
        relatorio.fotos = compressedFotos;
      }
    }
  }
  
  return data;
};

// Exporta todos os dados do IndexedDB
export const exportDatabaseData = async (): Promise<BackupData> => {
  // Verificar se o banco de dados está pronto
  if (!db.isOpen()) {
    await db.open();
  }
  
  try {
    // Buscar dados de todas as tabelas
    const treinos = await db.treinos.toArray();
    const exercicios = await db.exercicios.toArray();
    const series = await db.series.toArray();
    const historico = await db.historico.toArray();
    const cardio = await db.cardio.toArray();
    const fotosProgresso = await db.fotosProgresso.toArray();
    const historicoTreinos = await db.historicoTreinos.toArray();
    const fotos = await db.fotos.toArray();
    const relatorios = await db.relatorios.toArray();
    
    // Criar metadata do backup
    const metadata: BackupMetadata = {
      date: new Date().toISOString(),
      size: 0, // Será calculado após compressão
      tables: ['treinos', 'exercicios', 'series', 'historico', 'cardio', 'fotosProgresso', 'historicoTreinos', 'fotos', 'relatorios'],
    };
    
    // Criar objeto de dados completo
    let data: BackupData = {
      metadata,
      treinos,
      exercicios,
      series,
      historico,
      cardio,
      fotosProgresso,
      historicoTreinos,
      fotos,
      relatorios,
    };
    
    // Limitar número de fotos para reduzir tamanho
    data = limitarFotosBackup(data);
    
    // Comprimir dados (principalmente imagens) antes de salvar
    const compressedData = await compressBackupData(data);
    
    // Calcular tamanho aproximado após compressão
    const dataString = JSON.stringify(compressedData);
    compressedData.metadata.size = dataString.length;
    
    return compressedData;
  } catch (error) {
    console.error('Erro ao exportar dados do banco:', error);
    throw error;
  }
};

// Importa os dados do backup para o IndexedDB
const importDatabaseData = async (backupData: BackupData): Promise<boolean> => {
  try {
    // Verificar se o banco de dados está pronto
    if (!db.isOpen()) {
      await db.open();
    }
    
    // Limpar dados existentes
    await db.treinos.clear();
    await db.exercicios.clear();
    await db.series.clear();
    await db.historico.clear();
    await db.cardio.clear();
    await db.fotosProgresso.clear();
    await db.historicoTreinos.clear();
    await db.fotos.clear();
    await db.relatorios.clear();
    
    // Importar dados do backup (sem os IDs para evitar conflitos)
    if (backupData.treinos && backupData.treinos.length > 0) {
      await db.treinos.bulkAdd(backupData.treinos);
    }
    
    if (backupData.exercicios && backupData.exercicios.length > 0) {
      await db.exercicios.bulkAdd(backupData.exercicios);
    }
    
    if (backupData.series && backupData.series.length > 0) {
      await db.series.bulkAdd(backupData.series);
    }
    
    if (backupData.historico && backupData.historico.length > 0) {
      await db.historico.bulkAdd(backupData.historico);
    }
    
    if (backupData.cardio && backupData.cardio.length > 0) {
      await db.cardio.bulkAdd(backupData.cardio);
    }
    
    if (backupData.fotosProgresso && backupData.fotosProgresso.length > 0) {
      await db.fotosProgresso.bulkAdd(backupData.fotosProgresso);
    }
    
    if (backupData.historicoTreinos && backupData.historicoTreinos.length > 0) {
      await db.historicoTreinos.bulkAdd(backupData.historicoTreinos);
    }
    
    if (backupData.fotos && backupData.fotos.length > 0) {
      await db.fotos.bulkAdd(backupData.fotos);
    }
    
    if (backupData.relatorios && backupData.relatorios.length > 0) {
      await db.relatorios.bulkAdd(backupData.relatorios);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao importar dados do backup:', error);
    throw error;
  }
};

// Gerencia os backups, removendo os mais antigos se exceder o limite
const manageBackups = async () => {
  try {
    // Obter todas as chaves de backup
    const backupKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_PREFIX)) {
        backupKeys.push(key);
      }
    }
    
    // Ordenar por data (mais recentes primeiro)
    backupKeys.sort((a, b) => {
      const dateA = a.replace(BACKUP_PREFIX, '');
      const dateB = b.replace(BACKUP_PREFIX, '');
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
    
    // Remover backups excedentes
    if (backupKeys.length > MAX_BACKUPS) {
      const keysToRemove = backupKeys.slice(MAX_BACKUPS);
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
        console.log(`Backup antigo removido: ${key}`);
      }
    }
  } catch (error) {
    console.error('Erro ao gerenciar backups:', error);
  }
};

// Realiza o backup automático
export const performAutomaticBackup = async (): Promise<void> => {
  try {
    // Verificar se já passou o intervalo desde o último backup
    const lastBackupStr = localStorage.getItem(LAST_BACKUP_DATE_KEY);
    const now = new Date();
    let shouldBackup = true;
    
    if (lastBackupStr) {
      const lastBackup = new Date(lastBackupStr);
      const diffTime = Math.abs(now.getTime() - lastBackup.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      shouldBackup = diffDays >= BACKUP_INTERVAL_DAYS;
    }
    
    if (shouldBackup) {
      console.log('Iniciando backup automático...');
      
      // Exportar dados
      const backupData = await exportDatabaseData();
      
      // Gerar chave com timestamp
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const backupKey = `${BACKUP_PREFIX}${timestamp}`;
      
      // Salvar no localStorage com gerenciamento de tamanho
      try {
        saveBackupData(backupKey, backupData);
      } catch (storageError: any) {
        if (storageError.name === 'QuotaExceededError') {
          console.warn('Cota de armazenamento excedida no backup automático, tentando backup sem imagens');
          // Remover completamente as imagens para backup de emergência
          const backupSemImagens = {
            ...backupData,
            fotosProgresso: backupData.fotosProgresso.map(item => ({
              ...item,
              frente: null,
              costas: null,
              lateralEsquerda: null,
              lateralDireita: null
            })),
            fotos: [],
            relatorios: backupData.relatorios.map(item => ({
              ...item,
              fotos: []
            }))
          };
          
          // Tenta salvar versão mínima
          localStorage.setItem(backupKey, JSON.stringify(backupSemImagens));
          localStorage.setItem(`${backupKey}_isEmergency`, 'true');
          console.log('Backup automático de emergência criado sem imagens');
        } else {
          console.error('Erro ao salvar backup automático:', storageError);
        }
      }
      
      localStorage.setItem(LAST_BACKUP_DATE_KEY, now.toISOString());
      
      // Gerenciar backups antigos
      await manageBackups();
      
      console.log(`Backup automático concluído: ${backupKey}`);
    } else {
      console.log('Backup automático ignorado: intervalo não atingido');
    }
  } catch (error) {
    console.error('Erro ao realizar backup automático:', error);
  }
};

// Verifica se existe backup e restaura o mais recente (em caso de emergência/perda de dados)
export const checkAndRestoreIfNeeded = async (): Promise<boolean> => {
  try {
    // Verificar se há dados no IndexedDB
    const treinosCount = await db.treinos.count();
    const exerciciosCount = await db.exercicios.count();
    
    // Se não houver dados, verificar se há backup
    if (treinosCount === 0 && exerciciosCount === 0) {
      // Obter todas as chaves de backup
      const backupKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(BACKUP_PREFIX)) {
          backupKeys.push(key);
        }
      }
      
      // Se não houver backups, retornar false
      if (backupKeys.length === 0) {
        return false;
      }
      
      // Ordenar por data (mais recentes primeiro)
      backupKeys.sort((a, b) => {
        const dateA = a.replace(BACKUP_PREFIX, '');
        const dateB = b.replace(BACKUP_PREFIX, '');
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      // Restaurar o backup mais recente
      const latestBackupKey = backupKeys[0];
      const backupStr = localStorage.getItem(latestBackupKey);
      
      if (backupStr) {
        const backupData = JSON.parse(backupStr) as BackupData;
        await importDatabaseData(backupData);
        console.log(`Restaurado automaticamente do backup: ${latestBackupKey}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao verificar/restaurar backup:', error);
    return false;
  }
};

// Função para dividir backups grandes em partes menores
const saveBackupData = (backupKey: string, backupData: BackupData): void => {
  try {
    const dataStr = JSON.stringify(backupData);
    
    // Se o tamanho dos dados for menor que 4MB (um tamanho seguro para localStorage), salvar diretamente
    const MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB em bytes
    
    if (dataStr.length < MAX_CHUNK_SIZE) {
      localStorage.setItem(backupKey, dataStr);
      return;
    }
    
    // Para backups grandes, dividir em partes
    // Primeiro, remover as fotos do backup principal e salvar separadamente
    const backupSemFotos = {
      ...backupData,
      fotosProgresso: backupData.fotosProgresso.map(item => ({
        ...item,
        frente: null,
        costas: null,
        lateralEsquerda: null,
        lateralDireita: null
      })),
      fotos: [],
      relatorios: backupData.relatorios.map(item => ({
        ...item,
        fotos: []
      }))
    };
    
    // Salvar dados essenciais sem fotos
    const essentialDataStr = JSON.stringify(backupSemFotos);
    localStorage.setItem(backupKey, essentialDataStr);
    console.log(`Backup essencial salvo (${(essentialDataStr.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Registrar que este backup é parcial
    localStorage.setItem(`${backupKey}_isParcial`, 'true');
    
    // Tentar salvar algumas informações de tamanho para o usuário saber
    try {
      const tamanhoInfo = {
        tamanhoTotal: dataStr.length,
        tamanhoSalvo: essentialDataStr.length,
        numFotos: backupData.fotos.length,
        numFotosProgresso: backupData.fotosProgresso.length
      };
      localStorage.setItem(`${backupKey}_info`, JSON.stringify(tamanhoInfo));
    } catch (e) {
      console.warn('Não foi possível salvar informações sobre o tamanho do backup');
    }
    
    console.log('Backup parcial realizado: fotos e outras mídias grandes foram excluídas para economizar espaço');
    
  } catch (error) {
    console.error('Erro ao salvar dados do backup:', error);
    throw error;
  }
};

// Exporta funções para uso manual (se necessário)
export const manualBackup = async (): Promise<string> => {
  try {
    // Exportar dados
    const backupData = await exportDatabaseData();
    
    // Gerar chave com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `${BACKUP_PREFIX}${timestamp}`;
    
    // Salvar no localStorage com gerenciamento de tamanho
    try {
      saveBackupData(backupKey, backupData);
    } catch (storageError: any) {
      if (storageError.name === 'QuotaExceededError') {
        console.warn('Cota de armazenamento excedida, tentando backup sem imagens');
        // Remover completamente as imagens para backup de emergência
        const backupSemImagens = {
          ...backupData,
          fotosProgresso: backupData.fotosProgresso.map(item => ({
            ...item,
            frente: null,
            costas: null,
            lateralEsquerda: null,
            lateralDireita: null
          })),
          fotos: [],
          relatorios: backupData.relatorios.map(item => ({
            ...item,
            fotos: []
          }))
        };
        
        // Tenta salvar versão mínima
        localStorage.setItem(backupKey, JSON.stringify(backupSemImagens));
        localStorage.setItem(`${backupKey}_isEmergency`, 'true');
        console.log('Backup de emergência criado sem imagens');
      } else {
        throw storageError;
      }
    }
    
    localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date().toISOString());
    
    // Gerenciar backups antigos
    await manageBackups();
    
    return backupKey;
  } catch (error) {
    console.error('Erro ao realizar backup manual:', error);
    throw error;
  }
};

export const getBackupsList = (): { key: string, date: Date, size: string, isParcial: boolean }[] => {
  const backups: { key: string, date: Date, size: string, isParcial: boolean }[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX) && !key.includes('_isParcial') && !key.includes('_info') && !key.includes('_isEmergency')) {
      try {
        const backupStr = localStorage.getItem(key);
        if (backupStr) {
          const backupData = JSON.parse(backupStr) as BackupData;
          const date = new Date(backupData.metadata.date);
          const size = (backupData.metadata.size / (1024 * 1024)).toFixed(2) + ' MB';
          const isParcial = localStorage.getItem(`${key}_isParcial`) === 'true' || 
                           localStorage.getItem(`${key}_isEmergency`) === 'true';
          
          backups.push({ key, date, size, isParcial });
        }
      } catch (e) {
        console.error(`Erro ao ler backup ${key}:`, e);
      }
    }
  }
  
  // Ordenar por data (mais recentes primeiro)
  backups.sort((a, b) => b.date.getTime() - a.date.getTime());
  
  return backups;
};

export const restoreBackup = async (backupKey: string): Promise<boolean> => {
  try {
    const backupStr = localStorage.getItem(backupKey);
    if (!backupStr) {
      throw new Error(`Backup não encontrado: ${backupKey}`);
    }
    
    const backupData = JSON.parse(backupStr) as BackupData;
    await importDatabaseData(backupData);
    
    return true;
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    throw error;
  }
};

export const deleteBackup = (backupKey: string): boolean => {
  try {
    localStorage.removeItem(backupKey);
    return true;
  } catch (error) {
    console.error('Erro ao excluir backup:', error);
    return false;
  }
};

// Limitar o número de fotos no backup para reduzir tamanho
const limitarFotosBackup = (data: BackupData): BackupData => {
  // Configurações para limitar dados
  const MAX_FOTOS = 15; // Número máximo de fotos individuais a manter
  const MAX_FOTOS_PROGRESSO = 10; // Número máximo de registros de progresso a manter
  const MAX_RELATORIOS_COM_FOTOS = 5; // Número máximo de relatórios com fotos
  const MESES_HISTORICO = 6; // Número de meses para manter no histórico de exercícios

  // Limitar fotos individuais (manter apenas as mais recentes)
  if (data.fotos && data.fotos.length > MAX_FOTOS) {
    // Ordenar por data mais recente
    data.fotos.sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      return dateB - dateA; // Mais recentes primeiro
    });
    // Manter apenas o número máximo configurado
    data.fotos = data.fotos.slice(0, MAX_FOTOS);
    console.log(`Limitado para ${MAX_FOTOS} fotos no backup`);
  }

  // Limitar registros de progresso (manter apenas os mais recentes)
  if (data.fotosProgresso && data.fotosProgresso.length > MAX_FOTOS_PROGRESSO) {
    // Ordenar por data mais recente
    data.fotosProgresso.sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      return dateB - dateA; // Mais recentes primeiro
    });
    // Manter apenas o número máximo configurado
    data.fotosProgresso = data.fotosProgresso.slice(0, MAX_FOTOS_PROGRESSO);
    console.log(`Limitado para ${MAX_FOTOS_PROGRESSO} registros de progresso no backup`);
  }

  // Limitar fotos em relatórios (manter apenas relatórios recentes com fotos)
  if (data.relatorios && data.relatorios.length > 0) {
    // Ordenar relatórios por data
    data.relatorios.sort((a, b) => {
      const dateA = new Date(a.data).getTime();
      const dateB = new Date(b.data).getTime();
      return dateB - dateA; // Mais recentes primeiro
    });

    // Contar relatórios que têm fotos
    let relatoriosComFotos = 0;
    data.relatorios.forEach(relatorio => {
      if (relatorio.fotos && relatorio.fotos.length > 0) {
        relatoriosComFotos++;
        
        // Se exceder o limite, remover as fotos deste relatório
        if (relatoriosComFotos > MAX_RELATORIOS_COM_FOTOS) {
          relatorio.fotos = [];
        }
      }
    });
  }

  // Limitar histórico de exercícios para manter apenas os últimos meses
  if (data.historico && data.historico.length > 0) {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - MESES_HISTORICO);
    
    const historicoAntigo = data.historico.length;
    data.historico = data.historico.filter(registro => {
      const dataRegistro = new Date(registro.data);
      return dataRegistro >= dataLimite;
    });
    
    if (data.historico.length < historicoAntigo) {
      console.log(`Removidos ${historicoAntigo - data.historico.length} registros de histórico mais antigos que ${MESES_HISTORICO} meses`);
    }
  }

  return data;
};

// Exporta backup essencial (sem imagens)
export const exportEssentialBackupData = async (): Promise<BackupData> => {
  // Verificar se o banco de dados está pronto
  if (!db.isOpen()) {
    await db.open();
  }
  
  try {
    // Buscar dados de todas as tabelas exceto fotos
    const treinos = await db.treinos.toArray();
    const exercicios = await db.exercicios.toArray();
    const series = await db.series.toArray();
    const historico = await db.historico.toArray();
    const cardio = await db.cardio.toArray();
    const historicoTreinos = await db.historicoTreinos.toArray();
    const relatorios = await db.relatorios.toArray();
    
    // Criar metadata do backup
    const metadata: BackupMetadata = {
      date: new Date().toISOString(),
      size: 0, // Será calculado após compressão
      tables: ['treinos', 'exercicios', 'series', 'historico', 'cardio', 'historicoTreinos', 'relatorios'],
      essential: true // Marcar como backup essencial
    };
    
    // Criar objeto de dados sem fotos
    const data: BackupData = {
      metadata,
      treinos,
      exercicios,
      series,
      historico,
      cardio,
      fotosProgresso: [], // Array vazio
      historicoTreinos,
      fotos: [], // Array vazio
      relatorios,
    };
    
    // Calcular tamanho aproximado
    const dataString = JSON.stringify(data);
    data.metadata.size = dataString.length;
    
    return data;
  } catch (error) {
    console.error('Erro ao exportar backup essencial:', error);
    throw error;
  }
}; 