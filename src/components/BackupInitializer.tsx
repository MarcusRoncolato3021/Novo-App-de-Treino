'use client';

import { useEffect, useState } from 'react';
import { checkAndRestoreIfNeeded, performAutomaticBackup, setBackupInterval } from '../services/backupService';

const BackupInitializer = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeBackup = async () => {
      try {
        // Verifica se é necessário restaurar dados do backup
        const wasRestored = await checkAndRestoreIfNeeded();
        
        if (wasRestored) {
          console.log('[BackupInitializer] Dados restaurados com sucesso do backup');
        } else {
          console.log('[BackupInitializer] Nenhuma restauração foi necessária');
        }

        // Define o intervalo padrão de backup como 1 dia, se não estiver configurado
        if (!localStorage.getItem('app_backup_interval_days')) {
          setBackupInterval(1);
        }

        // Realiza backup automático se necessário
        const backupPerformed = await performAutomaticBackup();
        if (backupPerformed) {
          console.log('[BackupInitializer] Backup automático realizado com sucesso');
        }

        // Configura backup periódico a cada 24 horas
        const backupInterval = setInterval(async () => {
          const result = await performAutomaticBackup();
          if (result) {
            console.log('[BackupInitializer] Backup automático periódico realizado');
          }
        }, 24 * 60 * 60 * 1000); // 24 horas

        setInitialized(true);

        // Limpa o intervalo quando o componente é desmontado
        return () => clearInterval(backupInterval);
      } catch (error) {
        console.error('[BackupInitializer] Erro ao inicializar sistema de backup:', error);
      }
    };

    // Inicializa o sistema de backup apenas do lado do cliente
    if (typeof window !== 'undefined') {
      initializeBackup();
    }
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
};

export default BackupInitializer; 