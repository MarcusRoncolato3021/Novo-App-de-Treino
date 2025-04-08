'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db, RelatorioSemanal as DbRelatorioSemanal, TreinoRealizado as DbTreinoRealizado, Foto, FotoProgresso, isDatabaseReady, initDatabase } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
// Não precisamos do import dynamic aqui, vamos importar diretamente na função

// Definir o tipo para um relatório
type RelatorioSemanal = {
  id?: number;
  data: Date;
  dietaSemanal: string;
  comentarioTreino?: string;
  calorias?: number;
  treinos?: TreinoRealizado[];
  fotoIds?: number[];
};

// Tipo para treino realizado
type TreinoRealizado = {
  id?: number;
  data: Date;
  tipo: string;
};

export default function Relatorio() {
  const [isReady, setIsReady] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [dietaSemanal, setDietaSemanal] = useState('');
  const [comentarioTreino, setComentarioTreino] = useState('');
  const [calorias, setCalorias] = useState<string>('');
  const [activeTab, setActiveTab] = useState('relatorio');
  const [modalPdfVisible, setModalPdfVisible] = useState(false);
  const [relatoriosAnteriores, setRelatoriosAnteriores] = useState<RelatorioSemanal[]>([]);
  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioSemanal | null>(null);
  const [fotosIds, setFotosIds] = useState<number[]>([]);
  const [ultimoRegistroProcessado, setUltimoRegistroProcessado] = useState<string | null>(null);
  
  // Estados adicionais necessários para compatibilidade
  const [erroDatabase, setErroDatabase] = useState<string | null>(null);
  const [dataPesquisa, setDataPesquisa] = useState('');
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<RelatorioSemanal[]>([]);
  const [treinosSemanais, setTreinosSemanais] = useState<TreinoRealizado[]>([]);
  const [relatorioEditando, setRelatorioEditando] = useState<number | null>(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mostrarModalFotos, setMostrarModalFotos] = useState(false);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<number[]>([]);
  const [fotosSelecionadasInfo, setFotosSelecionadasInfo] = useState<any[]>([]);
  const [fotosCarregando, setFotosCarregando] = useState<boolean>(false);
  const [dataComparacaoAntes, setDataComparacaoAntes] = useState<string>('');
  const [dataComparacaoDepois, setDataComparacaoDepois] = useState<string>('');
  const [fotoComparacaoAntes, setFotoComparacaoAntes] = useState<FotoProgresso | null>(null);
  const [fotoComparacaoDepois, setFotoComparacaoDepois] = useState<FotoProgresso | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<'frente' | 'costas' | 'lado_esquerdo' | 'lado_direito'>('frente');
  
  // Estados para comparação de relatórios
  const [relatorioAnterior, setRelatorioAnterior] = useState<RelatorioSemanal | null>(null);
  const [relatorioMaisRecente, setRelatorioMaisRecente] = useState<RelatorioSemanal | null>(null);
  const [fotosRelatorioAnterior, setFotosRelatorioAnterior] = useState<Foto[]>([]);
  const [fotosRelatorioRecente, setFotosRelatorioRecente] = useState<Foto[]>([]);
  const [pesoRelatorioAnterior, setPesoRelatorioAnterior] = useState<number | null>(null);
  const [pesoRelatorioRecente, setPesoRelatorioRecente] = useState<number | null>(null);
  const [mostrarComparacao, setMostrarComparacao] = useState<boolean>(false);
  const [exportandoPDF, setExportandoPDF] = useState<boolean>(false);
  const [relatoriosPesos, setRelatoriosPesos] = useState<{[id: number]: number}>({});
  const comparacaoRef = useRef<HTMLDivElement>(null);
  const [fotoTelaCheia, setFotoTelaCheia] = useState<string | null>(null);
  const [fotoDetalhes, setFotoDetalhes] = useState<{data: Date, tipo?: string, peso?: number} | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'dietaSemanal') {
      setDietaSemanal(value);
    } else if (name === 'calorias') {
      setCalorias(value);
    } else if (name === 'comentarioTreino') {
      setComentarioTreino(value);
    }
  };
  
  // Carregar dados do localStorage quando o componente montar
  useEffect(() => {
    const savedDietaSemanal = localStorage.getItem('relatorio_dietaSemanal');
    const savedCalorias = localStorage.getItem('relatorio_calorias');
    const savedComentarioTreino = localStorage.getItem('relatorio_comentarioTreino');
    
    if (savedDietaSemanal) {
      setDietaSemanal(savedDietaSemanal);
    }
    
    if (savedCalorias) {
      setCalorias(savedCalorias);
    }
    
    if (savedComentarioTreino) {
      setComentarioTreino(savedComentarioTreino);
    }
  }, []);
  
  // Buscar fotos selecionadas
  useEffect(() => {
    const carregarFotosSelecionadas = async () => {
      if (!isReady || fotosSelecionadas.length === 0) {
        setFotosIds([]);
        setFotosCarregando(false);
        setFotosSelecionadasInfo([]);
        return;
      }
      
      setFotosCarregando(true);
      
      try {
        // Buscar todas as fotos selecionadas usando seus IDs
        const fotos = await Promise.all(
          fotosSelecionadas.map(id => db.fotos.get(id))
        );
        
        // Filtrar fotos que existem (não foram excluídas)
        const fotosValidas = fotos.filter(foto => foto !== undefined) as Foto[];
        
        // Atualizar IDs e informações
        setFotosIds(fotosValidas.map(foto => foto.id!));
        setFotosSelecionadasInfo(fotosValidas);
        
        // Restaurar valores salvos no localStorage após carregar fotos
        const savedDietaSemanal = localStorage.getItem('relatorio_dietaSemanal');
        const savedCalorias = localStorage.getItem('relatorio_calorias');
        const savedComentarioTreino = localStorage.getItem('relatorio_comentarioTreino');
        
        if (savedDietaSemanal) {
          setDietaSemanal(savedDietaSemanal);
        }
        
        if (savedCalorias) {
          setCalorias(savedCalorias);
        }
        
        if (savedComentarioTreino) {
          setComentarioTreino(savedComentarioTreino);
        }
      } catch (error) {
        console.error("Erro ao carregar fotos selecionadas:", error);
      } finally {
        setFotosCarregando(false);
      }
    };
    
    carregarFotosSelecionadas();
  }, [isReady, fotosSelecionadas]);
  
  // Efeito para salvar os valores do formulário cada vez que eles mudam
  useEffect(() => {
    if (dietaSemanal) {
      localStorage.setItem('relatorio_dietaSemanal', dietaSemanal);
    }
    
    if (calorias) {
      localStorage.setItem('relatorio_calorias', calorias);
    }
    
    if (comentarioTreino) {
      localStorage.setItem('relatorio_comentarioTreino', comentarioTreino);
    }
  }, [dietaSemanal, calorias, comentarioTreino]);
  
  // Buscar relatórios anteriores
  const relatoriosAnterioresQuery = useLiveQuery(async () => {
    if (!isReady) return [];
    return await db.relatorios.orderBy('data').reverse().toArray();
  }, [isReady]);
  
  useEffect(() => {
    if (relatoriosAnterioresQuery) {
      setRelatoriosAnteriores(relatoriosAnterioresQuery);
    }
  }, [relatoriosAnterioresQuery]);

  const searchParams = useSearchParams();

  // Tipos de fotos para exibição
  const tiposFoto = [
    { id: 'frente', nome: 'Frente', icone: '👤' },
    { id: 'costas', nome: 'Costas', icone: '👤' },
    { id: 'lado_esquerdo', nome: 'Lado Esq.', icone: '👤' },
    { id: 'lado_direito', nome: 'Lado Dir.', icone: '👤' }
  ];

  // Verificar se o banco de dados está pronto imediatamente ao carregar o componente
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        console.log("[Database] Verificando status do banco de dados");
        
        // Forçar inicialização do banco de dados
        await initDatabase();
        
        const isReady = await isDatabaseReady();
        console.log("[Database] Status do banco de dados:", isReady ? "Pronto" : "Não pronto");
        
        setIsReady(isReady);
        
        if (!isReady) {
          setErroDatabase("Erro ao conectar ao banco de dados");
          toast.error("Erro ao conectar ao banco de dados. Recarregue a página.");
        } else {
          console.log("[Database] Banco de dados pronto para uso");
        }
      } catch (error) {
        console.error("[Database] Erro ao verificar banco de dados:", error);
        setErroDatabase("Erro ao verificar banco de dados: " + (error instanceof Error ? error.message : "Desconhecido"));
        toast.error("Erro de conexão com o banco de dados. Recarregue a página.");
        setIsReady(false);
      }
    };
    
    // Executa imediatamente ao montar o componente
    checkDatabase();
    
    // Configura verificação periódica do banco de dados
    const dbCheckInterval = setInterval(() => {
      if (!isReady) {
        console.log("[Database] Verificando banco de dados novamente...");
        checkDatabase();
      }
    }, 3000); // Verificar a cada 3 segundos se não estiver pronto
    
    return () => {
      clearInterval(dbCheckInterval);
    };
  }, [isReady]);

  // Buscar relatórios existentes usando Dexie
  const relatorios = useLiveQuery(
    () => db.relatorios.orderBy('data').reverse().toArray()
  );

  // Buscar treinos da semana atual
  const treinos = useLiveQuery(
    () => db.treinos.toArray()
  );

  const cardioExercicios = useLiveQuery(
    () => db.cardio.toArray()
  );

  // Buscar fotos
  const fotos = useLiveQuery(
    () => db.fotos.orderBy('data').reverse().toArray()
  );

  // Efeito para filtrar relatórios quando a pesquisa ou relatórios mudam
  useEffect(() => {
    if (!relatorios) return;

    if (!dataPesquisa) {
      setRelatoriosFiltrados(relatorios);
      return;
    }

    const filtrados = relatorios.filter((relatorio) => {
      const dataRelatorio = new Date(relatorio.data);
      const dataFormatada = dataRelatorio.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      return dataFormatada.includes(dataPesquisa);
    });

    setRelatoriosFiltrados(filtrados);
  }, [dataPesquisa, relatorios]);

  // Efeito para buscar e filtrar treinos da semana atual
  useEffect(() => {
    if (!treinos || !cardioExercicios) return;

    // Obter a data do início da semana atual (domingo)
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
    inicioSemana.setHours(0, 0, 0, 0);

    // Obter a data do fim da semana atual (sábado)
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6); // Sábado
    fimSemana.setHours(23, 59, 59, 999);

    // Filtrar treinos da semana atual
    const treinosDaSemana = treinos
      .filter(treino => {
        const dataTreino = new Date(treino.data);
        return dataTreino >= inicioSemana && dataTreino <= fimSemana;
      })
      .map(treino => ({
        data: treino.data,
        tipo: 'Musculação'
      }));

    // Filtrar exercícios cardio da semana atual
    const cardiosDaSemana = cardioExercicios
      .filter((cardio) => {
        const dataCardio = new Date(cardio.data);
        return dataCardio >= inicioSemana && dataCardio <= fimSemana;
      })
      .map((cardio) => ({
        data: cardio.data,
        tipo: 'Cardio'
      }));

    // Combinar os dois tipos de treino e ordenar por data
    const todosTreinos = [...treinosDaSemana, ...cardiosDaSemana]
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    setTreinosSemanais(todosTreinos);
  }, [treinos, cardioExercicios]);

  // Efeito para carregar fotos selecionadas quando editar um relatório
  useEffect(() => {
    const carregarFotosSelecionadas = async () => {
      if (relatorioEditando && relatorios) {
        const relatorio = relatorios.find(r => r.id === relatorioEditando);
        if (relatorio && relatorio.fotoIds && relatorio.fotoIds.length > 0) {
          setFotosSelecionadas(relatorio.fotoIds);
          
          // Buscar informações detalhadas das fotos selecionadas
          const fotosInfo = await Promise.all(
            relatorio.fotoIds.map(id => db.fotos.get(id))
          );
          
          // Filtrar fotos que existem (não foram excluídas)
          const fotosValidas = fotosInfo.filter(foto => foto !== undefined) as Foto[];
          setFotosSelecionadasInfo(fotosValidas);
        } else {
          setFotosSelecionadas([]);
          setFotosSelecionadasInfo([]);
        }
      } else {
        setFotosSelecionadas([]);
        setFotosSelecionadasInfo([]);
      }
    };
    
    carregarFotosSelecionadas();
  }, [relatorioEditando, relatorios]);

  // Efeito para atualizar as informações das fotos selecionadas quando a lista de fotos mudar
  useEffect(() => {
    const atualizarFotosSelecionadas = async () => {
      if (fotosSelecionadas.length > 0 && fotos) {
        const fotosInfo = fotos.filter(foto => 
          foto.id !== undefined && fotosSelecionadas.includes(foto.id)
        );
        setFotosSelecionadasInfo(fotosInfo);
      }
    };
    
    atualizarFotosSelecionadas();
  }, [fotosSelecionadas, fotos]);

  // Efeito para processar o ID da foto selecionada
  useEffect(() => {
    // Não processar se o banco de dados não estiver pronto
    if (!isReady) {
      console.log("Aguardando banco de dados ficar pronto...");
      return;
    }
    
    const processarRegistro = async () => {
      try {
        const registroId = searchParams.get('registroId');
        if (!registroId) {
          return; // Não há ID para processar
        }
        
        // Verificar se já processamos este ID para evitar recarregamento
        if (ultimoRegistroProcessado === registroId) {
          return;
        }
        
        const id = parseInt(registroId);
        if (isNaN(id)) {
          toast.error("ID de registro inválido");
          return;
        }
        
        // Verificar se o banco de dados está disponível
        if (!db.isOpen()) {
          await isDatabaseReady();
          if (!db.isOpen()) {
            toast.error("Erro de conexão com o banco de dados");
            return;
          }
        }
        
        // Buscar o registro
        const registro = await db.fotosProgresso.get(id);
        if (!registro) {
          toast.error("Registro de fotos não encontrado");
          return;
        }
        
        // Verificar se o registro tem fotos e peso
        if (!registro.frente && !registro.costas && !registro.lateralEsquerda && !registro.lateralDireita) {
          toast.error("O registro selecionado não possui fotos");
          return;
        }
        
        // Array para guardar os IDs das fotos adicionadas
        const fotoIdsAdicionados: number[] = [];
        const fotosAdicionadas: Foto[] = [];
        
        // Método alternativo: Usar funções separadas para cada foto
        if (registro.frente) {
          try {
            // Criar objeto de foto
            const foto: Foto = {
              data: registro.data,
              url: registro.frente,
              tipo: 'frente',
              peso: registro.peso
            };
            
            // Adicionar ao banco
            const fotoId = await db.fotos.add(foto);
            console.log(`Foto frente adicionada, ID: ${fotoId}`);
            
            // Guardar ID e objeto
            fotoIdsAdicionados.push(fotoId);
            fotosAdicionadas.push({...foto, id: fotoId});
          } catch (e) {
            console.error("Erro ao adicionar foto frente:", e);
          }
        }
        
        if (registro.costas) {
          try {
            // Criar objeto de foto
            const foto: Foto = {
              data: registro.data,
              url: registro.costas,
              tipo: 'costas',
              peso: registro.peso
            };
            
            // Adicionar ao banco
            const fotoId = await db.fotos.add(foto);
            console.log(`Foto costas adicionada, ID: ${fotoId}`);
            
            // Guardar ID e objeto
            fotoIdsAdicionados.push(fotoId);
            fotosAdicionadas.push({...foto, id: fotoId});
          } catch (e) {
            console.error("Erro ao adicionar foto costas:", e);
          }
        }
        
        if (registro.lateralEsquerda) {
          try {
            // Criar objeto de foto
            const foto: Foto = {
              data: registro.data,
              url: registro.lateralEsquerda,
              tipo: 'lado_esquerdo',
              peso: registro.peso
            };
            
            // Adicionar ao banco
            const fotoId = await db.fotos.add(foto);
            console.log(`Foto lateral esquerda adicionada, ID: ${fotoId}`);
            
            // Guardar ID e objeto
            fotoIdsAdicionados.push(fotoId);
            fotosAdicionadas.push({...foto, id: fotoId});
          } catch (e) {
            console.error("Erro ao adicionar foto lateral esquerda:", e);
          }
        }
        
        if (registro.lateralDireita) {
          try {
            // Criar objeto de foto
            const foto: Foto = {
              data: registro.data,
              url: registro.lateralDireita,
              tipo: 'lado_direito',
              peso: registro.peso
            };
            
            // Adicionar ao banco
            const fotoId = await db.fotos.add(foto);
            console.log(`Foto lateral direita adicionada, ID: ${fotoId}`);
            
            // Guardar ID e objeto
            fotoIdsAdicionados.push(fotoId);
            fotosAdicionadas.push({...foto, id: fotoId});
          } catch (e) {
            console.error("Erro ao adicionar foto lateral direita:", e);
          }
        }
        
        // Atualizar estado se alguma foto foi adicionada
        if (fotoIdsAdicionados.length > 0) {
          // Atualizar o estado com os novos IDs e objetos
          const novosFotosSelecionadas = [...fotosSelecionadas, ...fotoIdsAdicionados];
          setFotosSelecionadas(novosFotosSelecionadas);
          
          // Registrar que processamos este ID
          setUltimoRegistroProcessado(registroId);
          
          toast.success(`${fotoIdsAdicionados.length} fotos adicionadas ao relatório`);
        } else {
          toast.error("Não foi possível adicionar nenhuma foto");
        }
        
      } catch (error) {
        console.error("Erro ao processar registro:", error);
        toast.error("Ocorreu um erro ao processar as fotos");
      }
    };
    
    // Salvar estado atual no localStorage antes de processar
    if (searchParams.get('registroId')) {
      localStorage.setItem('relatorio_dietaSemanal', dietaSemanal);
      localStorage.setItem('relatorio_calorias', calorias);
      localStorage.setItem('relatorio_comentarioTreino', comentarioTreino);
    }
    
    processarRegistro();
  }, [searchParams, isReady, ultimoRegistroProcessado, fotosSelecionadas]);

  // Buscar fotos quando as datas de comparação mudarem
  useEffect(() => {
    const buscarFotosComparacao = async () => {
      if (dataComparacaoAntes && dataComparacaoDepois && dataComparacaoAntes !== dataComparacaoDepois) {
        // Buscar todas as fotos
        const todasFotos = await db.fotosProgresso
          .orderBy('data')
          .toArray();

        // Encontrar as fotos correspondentes às datas selecionadas
        const fotoAntesResult = todasFotos.find(foto => {
          const dataFoto = new Date(foto.data);
          const dataStr = dataFoto.toISOString().split('T')[0];
          return dataStr === dataComparacaoAntes;
        });

        const fotoDepoisResult = todasFotos.find(foto => {
          const dataFoto = new Date(foto.data);
          const dataStr = dataFoto.toISOString().split('T')[0];
          return dataStr === dataComparacaoDepois;
        });

        setFotoComparacaoAntes(fotoAntesResult || null);
        setFotoComparacaoDepois(fotoDepoisResult || null);
      } else {
        setFotoComparacaoAntes(null);
        setFotoComparacaoDepois(null);
      }
    };

    buscarFotosComparacao();
  }, [dataComparacaoAntes, dataComparacaoDepois]);

  const handleDataAntesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaData = e.target.value;
    setDataComparacaoAntes(novaData);
    // Se a data "depois" for igual à nova data "antes", limpar a data "depois"
    if (novaData === dataComparacaoDepois) {
      setDataComparacaoDepois('');
    }
  };

  const handleDataDepoisChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novaData = e.target.value;
    setDataComparacaoDepois(novaData);
    // Se a data "antes" for igual à nova data "depois", limpar a data "antes"
    if (novaData === dataComparacaoAntes) {
      setDataComparacaoAntes('');
    }
  };

  const getUrlFoto = (foto: FotoProgresso | null, tipo: string) => {
    if (!foto) return null;
    
    // Verificar se a foto existe antes de retornar a URL
    let url = null;
    switch (tipo) {
      case 'frente':
        url = foto.frente;
        break;
      case 'costas':
        url = foto.costas;
        break;
      case 'lado_esquerdo':
        url = foto.lateralEsquerda;
        break;
      case 'lado_direito':
        url = foto.lateralDireita;
        break;
    }
    
    return url;
  };

  const adicionarFotosComparacao = async () => {
    if (!fotoComparacaoAntes || !fotoComparacaoDepois) return;
    
    try {
      // Criar IDs únicos para as fotos
      const idAntes = Date.now();
      const idDepois = idAntes + 1;
      
      // Obter URLs das fotos selecionadas
      const urlAntes = getUrlFoto(fotoComparacaoAntes, tipoSelecionado);
      const urlDepois = getUrlFoto(fotoComparacaoDepois, tipoSelecionado);
      
      if (!urlAntes || !urlDepois) {
        toast.error("Alguma das fotos selecionadas não possui o tipo de imagem escolhido");
        return;
      }
      
      // Criar objetos de foto
      const fotoAntes: Foto = {
        id: idAntes,
        data: fotoComparacaoAntes.data,
        url: urlAntes,
        tipo: tipoSelecionado,
        peso: fotoComparacaoAntes.peso
      };
      
      const fotoDepois: Foto = {
        id: idDepois,
        data: fotoComparacaoDepois.data,
        url: urlDepois,
        tipo: tipoSelecionado,
        peso: fotoComparacaoDepois.peso
      };
      
      // Adicionar ao banco de dados
      await db.fotos.bulkAdd([fotoAntes, fotoDepois]);
      
      // Atualizar estado
      setFotosSelecionadas(prev => [...prev, idAntes, idDepois]);
      setFotosSelecionadasInfo(prev => [...prev, fotoAntes, fotoDepois]);
      
      toast.success("Fotos adicionadas ao relatório");
      
      // Limpar seleção
      setDataComparacaoAntes('');
      setDataComparacaoDepois('');
      setFotoComparacaoAntes(null);
      setFotoComparacaoDepois(null);
    } catch (error) {
      console.error("Erro ao adicionar fotos:", error);
      toast.error("Erro ao adicionar fotos ao relatório");
    }
  };

  const limparFormulario = () => {
    setDietaSemanal('');
    setComentarioTreino('');
    setCalorias('');
    setRelatorioEditando(null);
    setFotosSelecionadas([]);
    setFotosSelecionadasInfo([]);
  };

  // Função para salvar o relatório
  const salvarRelatorio = async () => {
    try {
      // Validar campos
      if (!dietaSemanal.trim()) {
        toast.error('Preencha a dieta semanal');
        return;
      }
      
      const novoRelatorio: Partial<RelatorioSemanal> = {
        data: dataSelecionada,
        dietaSemanal,
        comentarioTreino,
        calorias: calorias ? Number(calorias) : undefined,
        fotoIds: fotosSelecionadas
      };

      // Salvar no banco de dados
      const id = await db.relatorios.add(novoRelatorio as DbRelatorioSemanal);
      
      toast.success('Relatório salvo com sucesso!');
      
      // Limpar campos
      setDietaSemanal('');
      setComentarioTreino('');
      setCalorias('');
      
      // Limpar localStorage
      localStorage.removeItem('relatorio_dietaSemanal');
      localStorage.removeItem('relatorio_comentarioTreino');
      localStorage.removeItem('relatorio_calorias');
      
      // Limpar lista de fotos selecionadas
      setFotosSelecionadas([]);
      
      // Atualizar relatórios
      const atualizados = await db.relatorios.orderBy('data').reverse().toArray();
      setRelatoriosAnteriores(atualizados);
      
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      toast.error('Erro ao salvar relatório');
    }
  };

  const editarRelatorio = (relatorio: RelatorioSemanal) => {
    if (!relatorio.id) return;
    
    // Carregar dados do relatório no formulário
    setRelatorioEditando(relatorio.id);
    setDietaSemanal(relatorio.dietaSemanal || '');
    setComentarioTreino(relatorio.comentarioTreino || '');
    setCalorias(relatorio.calorias ? relatorio.calorias.toString() : '');
    
    // Se tiver fotos, carregá-las
    if (relatorio.fotoIds && relatorio.fotoIds.length > 0) {
      setFotosSelecionadas(relatorio.fotoIds);
    }
    
    // Voltar para a tela de formulário
    setMostrarHistorico(false);
  };

  const excluirRelatorio = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este relatório?')) {
      try {
        await db.relatorios.delete(id);
        toast.success('Relatório excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir relatório:', error);
        toast.error("Ocorreu um erro ao excluir o relatório");
      }
    }
  };

  const formatarData = (data: Date | string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Agrupar treinos por dia
  const treinosPorDia = treinosSemanais.reduce((acc, treino) => {
    const dataFormatada = formatarData(treino.data);
    
    if (!acc[dataFormatada]) {
      acc[dataFormatada] = [];
    }
    
    acc[dataFormatada].push(treino);
    return acc;
  }, {} as Record<string, typeof treinosSemanais>);

  const formatarDataFoto = (data: Date) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selecionarFoto = (fotoId: number) => {
    setFotosSelecionadas(prev => {
      // Se já está selecionada, remove
      if (prev.includes(fotoId)) {
        return prev.filter(id => id !== fotoId);
      }
      // Se não está, adiciona
      return [...prev, fotoId];
    });
  };

  // Função para buscar o peso associado a um relatório
  const buscarPesoDoRelatorio = async (relatorio: RelatorioSemanal): Promise<number | null> => {
    if (!relatorio.fotoIds || relatorio.fotoIds.length === 0) return null;
    
    // Buscar as fotos do relatório
    const fotosInfo = await Promise.all(
      relatorio.fotoIds.map(id => db.fotos.get(id))
    );
    
    // Encontrar a primeira foto com peso
    const fotoComPeso = fotosInfo.find(foto => foto && foto.peso && foto.peso > 0);
    
    return fotoComPeso?.peso || null;
  };
  
  // Função para comparar o relatório atual com o anterior
  const compararComRelatorioAnterior = async () => {
    if (!relatorios || relatorios.length < 2) {
      toast.error('São necessários pelo menos dois relatórios para comparação');
      return;
    }
    
    // Ordenar todos os relatórios por data (mais recente primeiro)
    const relatOrdenados = [...relatorios].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    
    // Pegar os dois relatórios mais recentes
    const relatorioMaisRecenteObj = relatOrdenados[0];
    const relatorioAnteriorObj = relatOrdenados[1];
    
    if (!relatorioMaisRecenteObj || !relatorioAnteriorObj) {
      toast.error('Não foi possível encontrar relatórios suficientes para comparação');
      return;
    }
    
    console.log("Comparando relatórios:", {
      atual: formatarData(relatorioMaisRecenteObj.data),
      anterior: formatarData(relatorioAnteriorObj.data)
    });
    
    // Definir os relatórios nos estados
    setRelatorioMaisRecente(relatorioMaisRecenteObj);
    setRelatorioAnterior(relatorioAnteriorObj);
    
    // Buscar fotos do relatório mais recente
    if (relatorioMaisRecenteObj.fotoIds && relatorioMaisRecenteObj.fotoIds.length > 0) {
      const fotosInfo = await Promise.all(
        relatorioMaisRecenteObj.fotoIds.map(id => db.fotos.get(id))
      );
      
      // Filtrar fotos válidas
      const fotosValidas = fotosInfo.filter(foto => foto !== undefined) as Foto[];
      setFotosRelatorioRecente(fotosValidas);
      
      // Buscar o peso do relatório mais recente
      if (relatorioMaisRecenteObj.id && relatorioMaisRecenteObj.fotoIds.length > 0) {
        const pesoEncontrado = await buscarPesoDoRelatorio(relatorioMaisRecenteObj);
        setPesoRelatorioRecente(pesoEncontrado);
      }
    }
    
    // Buscar fotos do relatório anterior
    if (relatorioAnteriorObj.fotoIds && relatorioAnteriorObj.fotoIds.length > 0) {
      const fotosInfo = await Promise.all(
        relatorioAnteriorObj.fotoIds.map(id => db.fotos.get(id))
      );
      
      // Filtrar fotos válidas
      const fotosValidas = fotosInfo.filter(foto => foto !== undefined) as Foto[];
      setFotosRelatorioAnterior(fotosValidas);
      
      // Buscar o peso do relatório anterior
      if (relatorioAnteriorObj.id && relatorioAnteriorObj.fotoIds.length > 0) {
        const pesoEncontrado = await buscarPesoDoRelatorio(relatorioAnteriorObj);
        setPesoRelatorioAnterior(pesoEncontrado);
      }
    }
    
    // Mostrar o modal de comparação
    setMostrarComparacao(true);
  };

  // Função para gerar chave única para fotos
  const gerarChaveUnicaFoto = (fotoId: number | undefined, index: number) => {
    // Garantir que a chave inclua tanto o ID da foto quanto um identificador único baseado no índice e posição
    const uniqueHash = `${Date.now().toString(36).substring(4)}-${Math.random().toString(36).substring(4)}`;
    return `foto-${fotoId || 'temp'}-${index}-${uniqueHash}`;
  };

  // Componente para exibir miniatura de foto
  const FotoMiniatura = ({ fotoId }: { fotoId: number }) => {
    const [fotoUrl, setFotoUrl] = useState<string | null>(null);
    const [fotoInfo, setFotoInfo] = useState<Foto | null>(null);
    const [erro, setErro] = useState(false);
    
    useEffect(() => {
      let isMounted = true;
      
      const carregarFoto = async () => {
        try {
          // Tentar buscar na tabela fotos primeiro
          let foto = await db.fotos.get(fotoId);
          
          if (foto && foto.url && isMounted) {
            console.log("[Debug] Foto encontrada na tabela fotos, ID:", fotoId);
            setFotoUrl(foto.url);
            setFotoInfo(foto);
            return;
          }
          
          // Se não encontrar, buscar na tabela fotosProgresso
          const fotoProgresso = await db.fotosProgresso.get(fotoId);
          console.log("[Debug] Buscando em fotosProgresso, ID:", fotoId, "Resultado:", !!fotoProgresso);
          
          if (fotoProgresso && isMounted) {
            let url = null;
            let tipo: 'frente' | 'costas' | 'lado_esquerdo' | 'lado_direito' | undefined = undefined;
            
            if (fotoProgresso.frente) {
              url = fotoProgresso.frente;
              tipo = 'frente';
            }
            else if (fotoProgresso.costas) {
              url = fotoProgresso.costas;
              tipo = 'costas';
            }
            else if (fotoProgresso.lateralEsquerda) {
              url = fotoProgresso.lateralEsquerda;
              tipo = 'lado_esquerdo';
            }
            else if (fotoProgresso.lateralDireita) {
              url = fotoProgresso.lateralDireita;
              tipo = 'lado_direito';
            }
            
            if (url) {
              setFotoUrl(url);
              console.log("[Debug] URL da foto definida a partir de fotosProgresso");
              
              // Criar objeto de foto para visualização
              const infoFoto: Foto = {
                id: fotoId,
                data: fotoProgresso.data,
                url: url,
                tipo: tipo,
                peso: fotoProgresso.peso
              };
              
              setFotoInfo(infoFoto);
              
              // Criar foto na tabela fotos se não existir
              if (!foto && isMounted) {
                const novaFoto: Foto = {
                  id: fotoId,
                  data: fotoProgresso.data,
                  url: url,
                  tipo: tipo,
                  peso: fotoProgresso.peso
                };
                
                try {
                  await db.fotos.add(novaFoto);
                  console.log("[Debug] Foto adicionada à tabela fotos:", fotoId);
                } catch (erroAdd) {
                  console.error("[Erro] Erro ao adicionar foto à tabela fotos:", erroAdd);
                }
              }
              return;
            }
          }
          
          // Se chegou aqui, não encontrou foto válida
          if (isMounted) {
            console.error("[Erro] Foto não encontrada para o ID:", fotoId);
            setErro(true);
          }
        } catch (error) {
          if (isMounted) {
            console.error("[Erro] Erro ao carregar miniatura da foto:", error);
            setErro(true);
          }
        }
      };
      
      carregarFoto();
      
      return () => {
        isMounted = false;
      };
    }, [fotoId]);
    
    if (erro) {
      return (
        <div className="bg-gray-100 rounded-lg w-full h-16 flex items-center justify-center">
          <span className="text-xs text-red-500">Erro ao carregar</span>
        </div>
      );
    }
    
    if (!fotoUrl) {
      return (
        <div className="bg-gray-100 rounded-lg w-full h-16 flex items-center justify-center">
          <span className="text-xs text-gray-400">Carregando...</span>
        </div>
      );
    }
    
    return (
      <div className="bg-gray-100 rounded-lg overflow-hidden w-full h-16">
        <img 
          src={fotoUrl} 
          alt="Miniatura de foto" 
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => {
            if (fotoInfo) {
              // Abrir foto em tela cheia
              setFotoTelaCheia(fotoUrl);
              setFotoDetalhes({
                data: fotoInfo.data,
                tipo: fotoInfo.tipo,
                peso: fotoInfo.peso
              });
            } else {
              // Fallback se não tiver todas as informações
              setFotoTelaCheia(fotoUrl);
              setFotoDetalhes(null);
            }
          }}
        />
      </div>
    );
  };

  // Componente para exibir foto com peso
  const FotoComPeso = ({ foto, onRemove }: { foto: Foto, onRemove: () => void }) => {
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(false);
    
    return (
      <div className="bg-gray-50 rounded-lg overflow-hidden relative">
        {carregando && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
        <img
          src={foto.url}
          alt={`Foto de ${formatarDataFoto(foto.data)}`}
          className={`w-full h-28 object-cover ${carregando ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setCarregando(false)}
          onError={() => {
            setCarregando(false);
            setErro(true);
          }}
        />
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="text-red-500 text-sm">Erro ao carregar</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2">
          <div className="flex flex-col">
            <p className="text-white text-xs truncate">
              {formatarDataFoto(foto.data)}
            </p>
            {foto.peso && foto.peso > 0 && (
              <p className="text-white text-xs mt-0.5">
                <span className="font-medium">{foto.peso} kg</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  };

  // Efeito para carregar os pesos das fotos nos relatórios
  useEffect(() => {
    const carregarPesosRelatorios = async () => {
      if (!relatoriosFiltrados || !relatoriosFiltrados.length) return;
      
      const pesos: {[id: number]: number} = {};
      
      for (const relatorio of relatoriosFiltrados) {
        if (relatorio.id && relatorio.fotoIds && relatorio.fotoIds.length > 0) {
          // Buscar fotos do relatório
          const fotosInfo = await Promise.all(
            relatorio.fotoIds.map(id => db.fotos.get(id))
          );
          
          // Encontrar a primeira foto com peso
          const fotoComPeso = fotosInfo.find(foto => foto && foto.peso && foto.peso > 0);
          
          if (fotoComPeso && fotoComPeso.peso && relatorio.id) {
            // Certifique-se de que o id seja tratado como número
            pesos[Number(relatorio.id)] = fotoComPeso.peso;
          }
        }
      }
      
      setRelatoriosPesos(pesos);
    };
    
    carregarPesosRelatorios();
  }, [relatoriosFiltrados]);

  // Função para exportar a comparação como PDF
  const exportarComparacao = async () => {
    if (!comparacaoRef.current || !relatorioAnterior || !relatorioMaisRecente) return;
    
    try {
      setExportandoPDF(true);
      toast.loading('Gerando PDF...');
      
      // Importar os módulos quando necessários
      const [html2canvas, jsPDFLib] = await Promise.all([
        import('html2canvas').then(module => module.default),
        import('jspdf').then(module => module.default)
      ]);
      
      // Criar objeto PDF
      const pdf = new jsPDFLib('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      let currentY = 15; // Posição Y inicial
      
      // Adicionar título ao PDF
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Relatório de Progresso', pdfWidth / 2, currentY, { align: 'center' });
      currentY += 12;
      
      // Adicionar subtítulo com datas
      pdf.setFontSize(14);
      pdf.text(
        `Comparação: ${formatarData(relatorioAnterior.data)} vs ${formatarData(relatorioMaisRecente.data)}`,
        pdfWidth / 2, 
        currentY, 
        { align: 'center' }
      );
      currentY += 12;
      
      // Adicionar informações de peso
      if (pesoRelatorioAnterior && pesoRelatorioRecente) {
        pdf.setFontSize(16);
        
        // Colocar os pesos lado a lado
        const xCentro = pdfWidth / 2;
        const xAnterior = xCentro - 40;
        const xRecente = xCentro + 40;
        
        pdf.text(`Peso: ${pesoRelatorioAnterior} kg`, xAnterior, currentY, { align: 'center' });
        pdf.text(`Peso: ${pesoRelatorioRecente} kg`, xRecente, currentY, { align: 'center' });
        
        // Adicionar diferença de peso
        const pesoAnteriorNum = parseFloat(String(pesoRelatorioAnterior));
        const pesoRecenteNum = parseFloat(String(pesoRelatorioRecente));
        
        if (!isNaN(pesoAnteriorNum) && !isNaN(pesoRecenteNum) && pesoAnteriorNum !== pesoRecenteNum) {
          currentY += 8;
          const diferenca = (pesoRecenteNum - pesoAnteriorNum).toFixed(1);
          const textoVariacao = `${Number(diferenca) > 0 ? '+' : ''}${diferenca} kg`;
          
          if (Number(diferenca) > 0) {
            pdf.setTextColor(220, 53, 69); // Vermelho para ganho de peso
          } else {
            pdf.setTextColor(25, 135, 84); // Verde para perda de peso
          }
          
          pdf.text(`(${textoVariacao})`, xRecente, currentY, { align: 'center' });
          pdf.setTextColor(0, 0, 0); // Voltar para cor preta
        }
        
        currentY += 12;
      }
      
      // Adicionar fotos ao PDF
      const tiposDeFotos = ['frente', 'costas', 'lado_esquerdo', 'lado_direito'];
      
      // Para cada tipo de foto, capturar e adicionar ao PDF
      for (const tipo of tiposDeFotos) {
        // Encontrar foto do tipo no relatório anterior
        const fotoAnterior = fotosRelatorioAnterior.find(f => f.tipo === tipo);
        
        // Encontrar foto do tipo no relatório mais recente
        const fotoRecente = fotosRelatorioRecente.find(f => f.tipo === tipo);
        
        if (!fotoAnterior && !fotoRecente) continue;
        
        // Adicionar título do tipo de foto
        pdf.setFontSize(14);
        pdf.text(tipo.replace('_', ' ').charAt(0).toUpperCase() + tipo.replace('_', ' ').slice(1), pdfWidth / 2, currentY, { align: 'center' });
        currentY += 8;
        
        // Configurar as imagens lado a lado
        const margemLateral = 15;
        const espacoDisponivel = pdfWidth - (2 * margemLateral);
        const larguraImagem = espacoDisponivel / 2 - 5; // 5mm de espaço entre as imagens
        const alturaMaxima = 110; // Altura máxima para as imagens
        
        // Posição X para cada imagem
        const xAnterior = margemLateral;
        const xRecente = margemLateral + larguraImagem + 10;
        
        // Adicionar imagens
        if (fotoAnterior) {
          try {
            const imgObj = new Image();
            imgObj.crossOrigin = "Anonymous";
            imgObj.src = fotoAnterior.url;
            
            // Criar canvas temporário para a imagem anterior
            const canvasAnterior = document.createElement('canvas');
            const ctx = canvasAnterior.getContext('2d');
            
            // Esperar a imagem carregar
            await new Promise((resolve) => {
              imgObj.onload = resolve;
              // Se a imagem falhar, resolva de qualquer forma após 2 segundos
              setTimeout(resolve, 2000);
            });
            
            // Definir dimensões do canvas
            canvasAnterior.width = imgObj.width;
            canvasAnterior.height = imgObj.height;
            
            // Desenhar imagem no canvas
            if (ctx) {
              ctx.drawImage(imgObj, 0, 0);
              
              // Adicionar ao PDF
              const imgData = canvasAnterior.toDataURL('image/jpeg', 0.95);
              
              // Calcular a altura proporcional da imagem
              const aspectRatio = imgObj.height / imgObj.width;
              const alturaImagem = Math.min(larguraImagem * aspectRatio, alturaMaxima);
              
              pdf.addImage(imgData, 'JPEG', xAnterior, currentY, larguraImagem, alturaImagem, '', 'FAST');
              
              // Adicionar texto com data
              pdf.setFontSize(10);
              pdf.text(formatarData(fotoAnterior.data), xAnterior + larguraImagem/2, currentY + alturaImagem + 5, { align: 'center' });
            }
          } catch (error) {
            console.error('Erro ao processar imagem anterior:', error);
          }
        }
        
        if (fotoRecente) {
          try {
            const imgObj = new Image();
            imgObj.crossOrigin = "Anonymous";
            imgObj.src = fotoRecente.url;
            
            // Criar canvas temporário para a imagem recente
            const canvasRecente = document.createElement('canvas');
            const ctx = canvasRecente.getContext('2d');
            
            // Esperar a imagem carregar
            await new Promise((resolve) => {
              imgObj.onload = resolve;
              // Se a imagem falhar, resolva de qualquer forma após 2 segundos
              setTimeout(resolve, 2000);
            });
            
            // Definir dimensões do canvas
            canvasRecente.width = imgObj.width;
            canvasRecente.height = imgObj.height;
            
            // Desenhar imagem no canvas
            if (ctx) {
              ctx.drawImage(imgObj, 0, 0);
              
              // Adicionar ao PDF
              const imgData = canvasRecente.toDataURL('image/jpeg', 0.95);
              
              // Calcular a altura proporcional da imagem
              const aspectRatio = imgObj.height / imgObj.width;
              const alturaImagem = Math.min(larguraImagem * aspectRatio, alturaMaxima);
              
              pdf.addImage(imgData, 'JPEG', xRecente, currentY, larguraImagem, alturaImagem, '', 'FAST');
              
              // Adicionar texto com data
              pdf.setFontSize(10);
              pdf.text(formatarData(fotoRecente.data), xRecente + larguraImagem/2, currentY + alturaImagem + 5, { align: 'center' });
            }
          } catch (error) {
            console.error('Erro ao processar imagem recente:', error);
          }
        }
        
        // Avançar para a próxima posição Y (considerando altura máxima + espaço para legenda)
        currentY += alturaMaxima + 15;
        
        // Se estiver perto do fim da página, adicionar nova página
        if (currentY > pdfHeight - 30 && tipo !== tiposDeFotos[tiposDeFotos.length - 1]) {
          pdf.addPage();
          currentY = 15;
        }
      }
      
      // Adicionar nova página para informações detalhadas do relatório atual
      pdf.addPage();
      currentY = 15;
      
      // Título da segunda página
      pdf.setFontSize(18);
      pdf.text('Informações do Relatório', pdfWidth / 2, currentY, { align: 'center' });
      currentY += 10;
      
      // Data do relatório
      pdf.setFontSize(14);
      pdf.text(`Data: ${formatarData(relatorioMaisRecente.data)}`, 10, currentY);
      currentY += 10;
      
      // Peso (se disponível)
      if (pesoRelatorioRecente) {
        pdf.text(`Peso: ${pesoRelatorioRecente} kg`, 10, currentY);
        currentY += 10;
      }
      
      // Calorias (se disponível)
      if (relatorioMaisRecente.calorias) {
        pdf.text(`Calorias: ${relatorioMaisRecente.calorias} kcal`, 10, currentY);
        currentY += 10;
      }
      
      // Treinos Realizados
      if (relatorioMaisRecente.treinos && relatorioMaisRecente.treinos.length > 0) {
        pdf.setFontSize(16);
        pdf.text('Treinos Realizados', 10, currentY);
        currentY += 8;
        
        pdf.setFontSize(12);
        
        // Agrupar treinos por dia
        const treinosPorDia: Record<string, TreinoRealizado[]> = {};
        
        relatorioMaisRecente.treinos.forEach(treino => {
          const dataFormatada = formatarData(treino.data);
          if (!treinosPorDia[dataFormatada]) {
            treinosPorDia[dataFormatada] = [];
          }
          treinosPorDia[dataFormatada].push(treino);
        });
        
        // Listar treinos agrupados por dia
        Object.entries(treinosPorDia).forEach(([data, treinos]) => {
          pdf.text(`• ${data}: ${treinos.map(t => t.tipo).join(', ')}`, 15, currentY);
          currentY += 6;
          
          // Verificar se precisa adicionar nova página
          if (currentY > pdfHeight - 20) {
            pdf.addPage();
            currentY = 15;
          }
        });
        
        currentY += 5;
      }
      
      // Dieta Semanal
      if (relatorioMaisRecente.dietaSemanal) {
        // Verificar se precisa adicionar nova página para a dieta
        if (currentY > pdfHeight - 50) {
          pdf.addPage();
          currentY = 15;
        }
        
        pdf.setFontSize(16);
        pdf.text('Dieta Semanal', 10, currentY);
        currentY += 8;
        
        pdf.setFontSize(12);
        
        // Quebrar texto da dieta em linhas
        const textLines = pdf.splitTextToSize(relatorioMaisRecente.dietaSemanal, pdfWidth - 20);
        
        // Adicionar texto da dieta com quebras de linha
        textLines.forEach((line: string) => {
          pdf.text(line, 10, currentY);
          currentY += 6;
          
          // Verificar se precisa adicionar nova página
          if (currentY > pdfHeight - 10) {
            pdf.addPage();
            currentY = 15;
          }
        });
      }
      
      // Adicionar rodapé com data de geração na última página
      // Obter o número total de páginas de forma alternativa
      const totalPages = pdf.internal.pages.length - 1;
      const lastPage = totalPages;
      pdf.setPage(lastPage);
      
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        pdfWidth / 2, pdfHeight - 10, { align: 'center' }
      );
      
      // Adicionar numeração de páginas em todas as páginas
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.text(`Página ${i} de ${totalPages}`, pdfWidth - 20, pdfHeight - 10);
      }
      
      // Salvar o PDF
      const dataAtual = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `relatorio_completo_${dataAtual}.pdf`;
      
      pdf.save(fileName);
      
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setExportandoPDF(false);
    }
  };

  // Função para selecionar/deselecionar uma foto para o relatório
  const toggleFoto = (fotoId: number) => {
    setFotosSelecionadas(prev => {
      // Se já está selecionada, remove
      if (prev.includes(fotoId)) {
        return prev.filter(id => id !== fotoId);
      }
      // Se não está, adiciona
      return [...prev, fotoId];
    });
  };

  // Renderiza as miniaturas das fotos selecionadas
  const renderFotosSelecionadas = () => {
    if (fotosCarregando) {
      return (
        <div className="flex justify-center items-center h-24">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }
    
    if (!fotosSelecionadasInfo || fotosSelecionadasInfo.length === 0) {
      return (
        <div className="text-gray-500 italic text-sm mt-2">
          Nenhuma foto selecionada
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3 mt-3">
        {fotosSelecionadasInfo.map((foto) => (
          <FotoComPeso 
            key={gerarChaveUnicaFoto(foto.id, 0)} 
            foto={foto} 
            onRemove={() => toggleFoto(foto.id!)} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <header className="pt-8 pb-6 px-6 bg-gray-50/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center max-w-5xl mx-auto">
          <div className="absolute left-0">
            {mostrarHistorico ? (
              <button 
                onClick={() => setMostrarHistorico(false)} 
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            ) : (
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>
            )}
          </div>

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
            {mostrarHistorico ? 'Histórico de Relatórios' : 'Relatório'}
          </h1>

          <div className="absolute right-0">
            {!mostrarHistorico && (
              <button 
                onClick={() => setMostrarHistorico(true)}
                className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
                aria-label="Ver histórico"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        {!mostrarHistorico ? (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex justify-center mb-4 px-4">
                <h1 className="text-2xl font-bold text-gray-900 text-center">
                  {relatorioEditando ? 'Editar Relatório' : 'Criar Relatório Semanal'}
                </h1>
              </div>
              
              <div className="space-y-8">
                {/* Treinos realizados na semana */}
                <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <h3 className="block text-base font-medium text-gray-700 text-center mb-3">
                    Treinos Realizados na Semana
                  </h3>
                  
                  {Object.keys(treinosPorDia).length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {Object.entries(treinosPorDia).map(([data, treinos]) => (
                        <div key={data} className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm text-gray-900">{data}</div>
                            <div className="text-xs text-gray-500">{treinos.length} treino(s)</div>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {treinos.map((treino, index) => (
                              <span
                                key={index}
                                className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${
                                  treino.tipo === 'Cardio'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {treino.tipo}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Nenhum treino registrado nesta semana
                    </div>
                  )}
                </div>
                
                {/* Campo de Como foi o treino na semana */}
                <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <label htmlFor="comentarioTreino" className="block text-base font-medium text-gray-700 text-center mb-3">
                    Como foi o treino na semana?
                  </label>
                  <textarea
                    id="comentarioTreino"
                    value={comentarioTreino}
                    onChange={(e) => setComentarioTreino(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={4}
                    placeholder="Descreva como foram seus treinos esta semana, seu progresso, dificuldades..."
                  ></textarea>
                </div>
                
                {/* Campo de Dieta Semanal */}
                <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <label htmlFor="dietaSemanal" className="block text-base font-medium text-gray-700 text-center mb-3">
                    Como foi a dieta na semana?
                  </label>
                  <textarea
                    id="dietaSemanal"
                    value={dietaSemanal}
                    onChange={(e) => setDietaSemanal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    rows={4}
                    placeholder="Descreva como foi sua alimentação esta semana..."
                    required
                  ></textarea>
                </div>
                
                {/* Campo de Calorias Opcional - versão mais compacta */}
                <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <label htmlFor="calorias" className="block text-base font-medium text-gray-700 text-center mb-3">
                    Quantidade de calorias da dieta <span className="text-sm text-gray-500">(opcional)</span>
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="number"
                      id="calorias"
                      value={calorias}
                      onChange={(e) => setCalorias(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0"
                      min="0"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <span className="text-gray-500">kcal</span>
                    </div>
                  </div>
                </div>
                
                {/* Fotos para o Relatório */}
                <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="block text-base font-medium text-gray-700 text-center w-full">
                      Fotos para o Relatório
                    </h3>
                    <div className="flex items-center">
                      <Link 
                        href="/fotos?historico=true&origem=relatorio" 
                        className="p-2 rounded-full hover:bg-gray-100 text-primary-600 hover:text-primary-700 transition-all duration-300"
                        aria-label="Selecionar fotos do histórico"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Lista de fotos já selecionadas */}
                  {fotosSelecionadasInfo.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700">Fotos selecionadas ({fotosSelecionadasInfo.length})</h4>
                        {fotosSelecionadasInfo.length > 0 && (
                          <button
                            onClick={() => {
                              if (confirm('Deseja remover todas as fotos selecionadas?')) {
                                setFotosSelecionadas([]);
                                setFotosSelecionadasInfo([]);
                                toast.success('Todas as fotos foram removidas');
                              }
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Remover todas
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[...fotosSelecionadasInfo].reverse().map((foto) => (
                          <FotoComPeso 
                            key={gerarChaveUnicaFoto(foto.id, 0)} 
                            foto={foto} 
                            onRemove={() => {
                              if (foto.id) {
                                toggleFoto(foto.id);
                                toast.success('Foto removida do relatório');
                              }
                            }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Botões */}
                <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center mt-6">
                  {relatorioEditando && (
                    <button
                      onClick={limparFormulario}
                      className="px-6 py-3 rounded-xl font-medium border border-gray-300 hover:bg-gray-50 transition-colors duration-300"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={compararComRelatorioAnterior}
                    className="px-6 py-3 rounded-xl font-medium border border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors duration-300"
                  >
                    Comparar com anterior
                  </button>
                  <button
                    onClick={salvarRelatorio}
                    className={`${relatorioEditando ? '' : 'w-full max-w-xs mx-auto'} px-6 py-3 rounded-xl font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors duration-300`}
                  >
                    {relatorioEditando ? 'Atualizar Relatório' : 'Salvar Relatório'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 text-center w-full">Histórico de Relatórios</h2>
              
              {/* Barra de pesquisa */}
              <div className="relative w-full max-w-md mx-auto">
                <input
                  type="text"
                  placeholder="Pesquisar por data (ex: 01/05/2023)"
                  value={dataPesquisa}
                  onChange={(e) => setDataPesquisa(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {dataPesquisa && (
                  <button 
                    onClick={() => setDataPesquisa('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {relatoriosFiltrados && relatoriosFiltrados.length > 0 ? (
              <div className="space-y-4">
                {relatoriosFiltrados.map((relatorio) => (
                  <div key={relatorio.id} className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 text-center w-full">
                        {formatarData(relatorio.data)}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editarRelatorio(relatorio)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => relatorio.id && excluirRelatorio(relatorio.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* Exibir treinos salvos no relatório */}
                    {relatorio.treinos && relatorio.treinos.length > 0 && (
                      <div className="mb-3 bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Treinos realizados:</p>
                        <div className="flex flex-wrap gap-2">
                          {relatorio.treinos.map((treino, index) => (
                            <div key={index} className="flex items-center">
                              <span 
                                className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${
                                  treino.tipo === 'Cardio' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {formatarData(treino.data)} - {treino.tipo}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Total: {relatorio.treinos.length} treino(s)
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3 text-gray-700">
                      <p className="whitespace-pre-line">{relatorio.dietaSemanal}</p>
                    </div>
                    
                    <div className="mt-3 flex justify-between">
                      {relatorio.id && relatoriosPesos[relatorio.id] > 0 && (
                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
                          {relatoriosPesos[relatorio.id]} kg
                        </span>
                      )}
                      
                      {relatorio.calorias && (
                        <span className="inline-block bg-primary-100 text-primary-800 px-3 py-1 rounded-lg text-sm font-medium">
                          {relatorio.calorias} kcal
                        </span>
                      )}
                    </div>
                    
                    {/* Exibir fotos vinculadas ao relatório */}
                    {relatorio.fotoIds && relatorio.fotoIds.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Fotos do relatório:</p>
                        <button
                          onClick={async () => {
                            // Buscar informações das fotos
                            const fotosInfo = await Promise.all(
                              relatorio.fotoIds!.map(id => db.fotos.get(id))
                            );
                            
                            // Filtrar fotos que existem
                            const fotosValidas = fotosInfo.filter(foto => foto !== undefined) as Foto[];
                            
                            // Atualizar estado e abrir modal
                            setFotosSelecionadas(relatorio.fotoIds!);
                            setFotosSelecionadasInfo(fotosValidas);
                            setMostrarModalFotos(true);
                          }}
                          className="flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-300 mb-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm">Ver todas as fotos ({relatorio.fotoIds.length})</span>
                        </button>
                        
                        {/* Miniatura das primeiras 4 fotos */}
                        <div className="grid grid-cols-4 gap-2">
                          {relatorio.fotoIds.slice(0, 4).map((fotoId, index) => (
                            <div key={gerarChaveUnicaFoto(fotoId, index)} className="relative">
                              {index === 3 && relatorio.fotoIds!.length > 4 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-medium">+{relatorio.fotoIds!.length - 4}</span>
                                </div>
                              )}
                              <FotoMiniatura fotoId={fotoId as number} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <p className="text-gray-500">
                  {dataPesquisa 
                    ? "Nenhum relatório encontrado para esta data" 
                    : "Nenhum relatório cadastrado ainda"}
                </p>
                <button
                  onClick={() => setMostrarHistorico(false)}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-300"
                >
                  Criar seu primeiro relatório
                </button>
              </div>
            )}
        </div>
        )}
      </main>

      {/* Modal para visualização em tela cheia */}
      {fotoTelaCheia && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => {
              setFotoTelaCheia(null);
              setFotoDetalhes(null);
            }}
            className="absolute top-4 right-4 text-white p-2 bg-black bg-opacity-30 rounded-full"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img
            src={fotoTelaCheia}
            alt="Foto em tela cheia"
            className="max-h-screen max-w-full object-contain"
          />
          
          {fotoDetalhes && (
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg">
              <p className="text-sm">
                {formatarDataFoto(fotoDetalhes.data)}
                {fotoDetalhes.tipo && ` - ${fotoDetalhes.tipo.replace('_', ' ')}`}
                {fotoDetalhes.peso && fotoDetalhes.peso > 0 && ` - ${fotoDetalhes.peso} kg`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Seleção de Fotos */}
      {mostrarModalFotos && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">Fotos do Relatório</h3>
              <button 
                onClick={() => setMostrarModalFotos(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 max-h-[calc(80vh-8rem)]">
              {fotosSelecionadasInfo && fotosSelecionadasInfo.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...fotosSelecionadasInfo].reverse().map((foto) => (
                    <div 
                      key={gerarChaveUnicaFoto(foto.id, 0)} 
                      className="bg-gray-50 rounded-lg overflow-hidden relative"
                    >
                      <img
                        src={foto.url}
                        alt={`Foto de ${formatarDataFoto(foto.data)}`}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2">
                        <p className="text-white text-xs">
                          {formatarDataFoto(foto.data)}
                        </p>
                        {foto.tipo && (
                          <p className="text-white text-xs">
                            {foto.tipo.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma foto encontrada neste relatório</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setMostrarModalFotos(false)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 max-w-[390px] mx-auto z-10">
        <div className="grid grid-cols-4 items-center">
          <Link href="/" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Início</span>
          </Link>
          <Link href="/fotos" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Fotos</span>
          </Link>
          <Link href="/comparacao" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-500">Comparação</span>
          </Link>
          <Link href="/relatorio" className="flex flex-col items-center justify-center p-2 hover:text-primary-600 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium text-primary-600">Relatório</span>
          </Link>
        </div>
      </nav>

      {/* Modal de comparação com relatório anterior */}
      {mostrarComparacao && relatorioAnterior && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col items-center">
              <div className="flex w-full items-center mb-4">
                <div className="flex-1"></div>
                <h3 className="text-xl font-semibold text-gray-800 text-center flex-grow">Comparação com relatório anterior</h3>
                <div className="flex-1 flex justify-end">
                  <button 
                    onClick={() => setMostrarComparacao(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <button 
                onClick={exportarComparacao}
                disabled={exportandoPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 transition-colors duration-300 flex items-center mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="font-medium">Baixar PDF</span>
                {exportandoPDF && (
                  <svg className="animate-spin ml-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 max-h-[calc(90vh-8rem)]">
              <div ref={comparacaoRef}>
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-center mb-3">Relatório Anterior</h4>
                    <p className="text-center text-gray-600 mb-2">
                      {formatarData(relatorioAnterior.data)}
                    </p>
                    {pesoRelatorioAnterior ? (
                      <p className="text-center font-medium text-lg mb-4">
                        Peso: <span className="text-blue-600">{pesoRelatorioAnterior} kg</span>
                      </p>
                    ) : (
                      <p className="text-center text-gray-500 mb-4">Peso não registrado</p>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-center mb-3">Relatório Mais Recente</h4>
                    <p className="text-center text-gray-600 mb-2">
                      {relatorioMaisRecente ? formatarData(relatorioMaisRecente.data) : ''}
                    </p>
                    {pesoRelatorioRecente ? (
                      <p className="text-center font-medium text-lg mb-4">
                        Peso: <span className="text-blue-600">{pesoRelatorioRecente} kg</span>
                        {pesoRelatorioAnterior ? (
                          <span className={`ml-2 text-sm ${pesoRelatorioRecente > pesoRelatorioAnterior ? 'text-red-500' : 'text-green-500'}`}>
                            ({pesoRelatorioRecente > pesoRelatorioAnterior ? '+' : ''}
                            {(pesoRelatorioRecente - pesoRelatorioAnterior).toFixed(1)} kg)
                          </span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="text-center text-gray-500 mb-4">Peso não registrado</p>
                    )}
                  </div>
                </div>
                
                {/* Comparação de Fotos */}
                <h4 className="text-lg font-medium mb-3 text-center">Comparação de Fotos</h4>
                <div className="space-y-6">
                  {['frente', 'costas', 'lado_esquerdo', 'lado_direito'].map(tipo => {
                    // Encontrar foto do tipo no relatório anterior
                    const fotoAnterior = fotosRelatorioAnterior.find(f => f.tipo === tipo);
                    
                    // Encontrar foto do tipo no relatório mais recente
                    const fotoRecente = fotosRelatorioRecente.find(f => f.tipo === tipo);
                    
                    if (!fotoAnterior && !fotoRecente) return null;
                    
                    return (
                      <div key={tipo} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-base font-medium mb-3 text-center capitalize">
                          {tipo.replace('_', ' ')}
                        </h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative">
                            {fotoAnterior ? (
                              <>
                                <img 
                                  src={fotoAnterior.url} 
                                  alt={`Foto anterior - ${tipo}`}
                                  className="w-full h-full object-cover"
                                  crossOrigin="anonymous"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2">
                                  <p className="text-white text-xs truncate">
                                    {formatarDataFoto(fotoAnterior.data)}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                Sem foto anterior
                              </div>
                            )}
                          </div>
                          
                          <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden relative">
                            {fotoRecente ? (
                              <>
                                <img 
                                  src={fotoRecente.url} 
                                  alt={`Foto atual - ${tipo}`}
                                  className="w-full h-full object-cover"
                                  crossOrigin="anonymous"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2">
                                  <p className="text-white text-xs truncate">
                                    {formatarDataFoto(fotoRecente.data)}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                Sem foto atual
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 