// Chaves para armazenamento
const BACKUP_KEY = 'app_backup_data';
const LAST_BACKUP_DATE_KEY = 'app_last_backup_date';
const BACKUP_INTERVAL_DAYS_KEY = 'app_backup_interval_days';

// Interface para os dados de backup
interface BackupData {
  treinos: any[];
  relatorios: any[];
  fotos: any[];
  configuracoes: any;
  timestamp: number;
}

/**
 * Verifica se é necessário restaurar dados de backup e realiza a restauração se necessário
 * @returns true se a restauração foi realizada, false caso contrário
 */
export const checkAndRestoreIfNeeded = async (): Promise<boolean> => {
  try {
    // Verifica se há dados armazenados no localStorage
    const treinosExistem = localStorage.getItem('treinos') !== null;
    const relatoriosExistem = localStorage.getItem('relatorios') !== null;
    const fotosExistem = localStorage.getItem('fotos') !== null;

    // Se os dados principais existem, não é necessário restaurar
    if (treinosExistem && relatoriosExistem && fotosExistem) {
      console.log('[Backup] Dados existentes encontrados, não é necessário restaurar');
      return false;
    }

    // Verifica se existe um backup
    const backupData = localStorage.getItem(BACKUP_KEY);
    if (!backupData) {
      console.log('[Backup] Nenhum backup encontrado para restaurar');
      return false;
    }

    // Restaura os dados do backup
    const backup: BackupData = JSON.parse(backupData);
    
    if (backup.treinos && !treinosExistem) {
      localStorage.setItem('treinos', JSON.stringify(backup.treinos));
    }
    
    if (backup.relatorios && !relatoriosExistem) {
      localStorage.setItem('relatorios', JSON.stringify(backup.relatorios));
    }
    
    if (backup.fotos && !fotosExistem) {
      localStorage.setItem('fotos', JSON.stringify(backup.fotos));
    }
    
    if (backup.configuracoes) {
      localStorage.setItem('configuracoes', JSON.stringify(backup.configuracoes));
    }

    console.log('[Backup] Dados restaurados com sucesso do backup de', new Date(backup.timestamp).toLocaleString());
    return true;
  } catch (error) {
    console.error('[Backup] Erro ao restaurar dados:', error);
    return false;
  }
};

/**
 * Realiza backup dos dados atuais
 * @returns true se o backup foi bem-sucedido, false caso contrário
 */
export const performBackup = async (): Promise<boolean> => {
  try {
    const treinos = JSON.parse(localStorage.getItem('treinos') || '[]');
    const relatorios = JSON.parse(localStorage.getItem('relatorios') || '[]');
    const fotos = JSON.parse(localStorage.getItem('fotos') || '[]');
    const configuracoes = JSON.parse(localStorage.getItem('configuracoes') || '{}');

    const backupData: BackupData = {
      treinos,
      relatorios,
      fotos,
      configuracoes,
      timestamp: Date.now()
    };

    localStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
    localStorage.setItem(LAST_BACKUP_DATE_KEY, Date.now().toString());

    console.log('[Backup] Backup realizado com sucesso em', new Date().toLocaleString());
    return true;
  } catch (error) {
    console.error('[Backup] Erro ao realizar backup:', error);
    return false;
  }
};

/**
 * Verifica se é necessário realizar um backup com base no intervalo configurado
 * @returns true se um backup é necessário, false caso contrário
 */
export const isBackupNeeded = (): boolean => {
  // Recupera a data do último backup
  const lastBackupStr = localStorage.getItem(LAST_BACKUP_DATE_KEY);
  if (!lastBackupStr) return true; // Se nunca fez backup, é necessário

  const lastBackup = parseInt(lastBackupStr, 10);
  const intervalDays = parseInt(localStorage.getItem(BACKUP_INTERVAL_DAYS_KEY) || '1', 10);
  
  // Calcula a diferença em dias
  const diffTime = Date.now() - lastBackup;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays >= intervalDays;
};

/**
 * Realiza backup automático se necessário com base na configuração de intervalo
 * @returns true se um backup foi realizado, false caso contrário
 */
export const performAutomaticBackup = async (): Promise<boolean> => {
  if (isBackupNeeded()) {
    return performBackup();
  }
  return false;
};

/**
 * Configura o intervalo de dias entre backups automáticos
 * @param days Número de dias entre backups
 */
export const setBackupInterval = (days: number): void => {
  localStorage.setItem(BACKUP_INTERVAL_DAYS_KEY, days.toString());
}; 