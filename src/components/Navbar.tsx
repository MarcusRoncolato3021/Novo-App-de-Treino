'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavbarProps = {
  onAddClick?: () => void;
};

export default function Navbar({ onAddClick }: NavbarProps) {
  const pathname = usePathname();

  // Verificar qual link está ativo
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 max-w-[390px] mx-auto z-10">
      <div className="grid grid-cols-5 items-center">
        <Link 
          href="/" 
          className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 ${isActive('/') ? 'text-primary-600' : 'text-gray-500'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className={`text-xs mt-1 font-medium ${isActive('/') ? 'text-primary-600' : 'text-gray-500'}`}>Início</span>
        </Link>
        
        <Link 
          href="/fotos" 
          className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 ${isActive('/fotos') ? 'text-primary-600' : 'text-gray-500'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`text-xs mt-1 font-medium ${isActive('/fotos') ? 'text-primary-600' : 'text-gray-500'}`}>Fotos</span>
        </Link>
        
        <button
          onClick={onAddClick}
          className="flex flex-col items-center justify-center bg-primary-600 rounded-full w-14 h-14 -mt-6 mx-auto hover:bg-primary-700 transition-colors duration-300 shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        
        <Link 
          href="/comparacao" 
          className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 ${isActive('/comparacao') ? 'text-primary-600' : 'text-gray-500'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className={`text-xs mt-1 font-medium ${isActive('/comparacao') ? 'text-primary-600' : 'text-gray-500'}`}>Comparação</span>
        </Link>
        
        <Link 
          href="/relatorio" 
          className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-6 w-6 ${isActive('/relatorio') ? 'text-primary-600' : 'text-gray-500'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className={`text-xs mt-1 font-medium ${isActive('/relatorio') ? 'text-primary-600' : 'text-gray-500'}`}>Relatório</span>
        </Link>
      </div>
    </nav>
  );
} 