/**
 * Utilitário de navegação para transições entre páginas
 * 
 * Navega para uma rota com opções adicionais
 * @param {object} router - O objeto router do Next.js
 * @param {string} url - URL de destino
 * @param {object} options - Opções adicionais
 * @param {number} options.delay - Atraso em ms antes de navegar (opcional)
 * @param {Function} options.onError - Callback para tratamento de erros (opcional)
 */
export const navegarCom = (router, url, options = {}) => {
  const { delay = 0, onError } = options;

  const executarNavegacao = () => {
    try {
      router.push(url);
    } catch (error) {
      // Tenta um fallback para window.location se router.push falhar
      try {
        window.location.href = url;
      } catch (err) {
        if (typeof onError === 'function') {
          onError(err);
        } else {
          console.error('Erro na navegação:', err);
        }
      }
    }
  };

  if (delay > 0) {
    setTimeout(executarNavegacao, delay);
  } else {
    executarNavegacao();
  }
};


