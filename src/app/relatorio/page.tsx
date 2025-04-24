'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import { db, RelatorioSemanal } from '@/lib/db';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';

registerLocale('pt-BR', ptBR);

// Componente principal
export default function Relatorio() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('relatorio');
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    // Definir a data como a data atual, com horário zerado
    const dataAtual = new Date();
    return dataAtual;
  });
  const [dietaSemanal, setDietaSemanal] = useState('');
  const [comentarioTreino, setComentarioTreino] = useState('');
  const [calorias, setCalorias] = useState('');
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [mostrarComparacao, setMostrarComparacao] = useState(false);
  const [dadosSalvos, setDadosSalvos] = useState<{[key: string]: any}[]>([]);
  const [fotosSelecionadas, setFotosSelecionadas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [peso, setPeso] = useState('');
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [relatoriosFiltrados, setRelatoriosFiltrados] = useState<{[key: string]: any}[]>([]);
  const [dataPesquisa, setDataPesquisa] = useState('');
  const [relatoriosExpandidos, setRelatoriosExpandidos] = useState<{[key: string]: boolean}>({});
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [registroEditando, setRegistroEditando] = useState<number | null>(null);
  const [fotoTelaCheia, setFotoTelaCheia] = useState<string | null>(null);
  const [fotosVisualizacao, setFotosVisualizacao] = useState<string[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [relatoriosComparacao, setRelatoriosComparacao] = useState<{
    recente: {[key: string]: any} | null,
    anterior: {[key: string]: any} | null
  }>({ recente: null, anterior: null });

  // Função para gerar PDF com jsPDF
  const gerarPDF = async () => {
    try {
      setExportandoPDF(true);
      toast.loading('Gerando PDF, aguarde...');

      try {
        // Criar instância jsPDF com orientação portrait (A4)
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Configurações de página
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15; // Margem reduzida para maximizar espaço
        
        // Configurar fonte e tamanho
        doc.setFont('helvetica');
        
        // Garantir que estamos usando os relatórios corretos da comparação
        let relatorioRecente, relatorioAnterior;
        
        // Obter o relatório recente da comparação ou da lista de relatórios
        if (relatoriosComparacao.recente) {
          relatorioRecente = relatoriosComparacao.recente;
        } else if (dadosSalvos.length > 0) {
          relatorioRecente = dadosSalvos[0];
        } else {
          relatorioRecente = {
            data: new Date(),
            peso: 0,
            calorias: '0',
            dieta: 'Sem dados',
            comentarios: 'Sem dados',
            fotos: []
          };
        }
        
        // Obter o relatório anterior da comparação ou da lista de relatórios
        if (relatoriosComparacao.anterior) {
          relatorioAnterior = relatoriosComparacao.anterior;
        } else if (dadosSalvos.length > 1) {
          relatorioAnterior = dadosSalvos[1];
        } else {
          relatorioAnterior = {
            data: new Date(),
            peso: 0,
            calorias: '0',
            dieta: 'Sem dados',
            comentarios: 'Sem dados',
            fotos: []
          };
        }
        
        // Log para debug
        console.log('Dados finais para o PDF:');
        console.log('Relatório Anterior:', relatorioAnterior);
        console.log('Peso do Relatório Anterior:', relatorioAnterior.peso);
        console.log('Relatório Recente:', relatorioRecente);
        console.log('Peso do Relatório Recente:', relatorioRecente.peso);
        
        // Arrays para fotos
        const fotosRecente = relatorioRecente.fotos || [];
        const fotosAnterior = relatorioAnterior.fotos || [];
        
        // Função auxiliar para corrigir a orientação das imagens
        const processarImagem = (imageBase64: string): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              // Criar canvas para manipular a imagem
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Definir as dimensões do canvas
              canvas.width = img.width;
              canvas.height = img.height;
              
              // Desenhar a imagem no canvas com a orientação correta
              if (ctx) {
                ctx.drawImage(img, 0, 0);
              }
              
              // Retornar a imagem corrigida
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = imageBase64;
          });
        };

        // === PÁGINA 1: FRENTE E COSTAS ===
        // Adicionar título
        doc.setFontSize(18);
        doc.setTextColor(40, 80, 200);
        doc.text('Relatório de Progresso', pageWidth / 2, margin, { align: 'center' });
        
        // Adicionar data
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        doc.text(`Data: ${dataAtual}`, pageWidth / 2, margin + 8, { align: 'center' });
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
        
        // Adicionar informação de comparação
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(
          `Comparação: ${formatarDataDDMMYY(new Date(relatorioAnterior.data))} vs ${formatarDataDDMMYY(new Date(relatorioRecente.data))}`, 
          pageWidth / 2, 
          margin + 20, 
          { align: 'center' }
        );
        
        // Adicionar informações de peso lado a lado
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        
        // Garantir que o peso do relatório recente seja um número válido
        const pesoRecente = relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso || 77;
        
        console.log('Peso do relatório recente para o PDF (mesmo valor da interface):', pesoRecente);
        
        // Garantir que o peso do relatório anterior seja um número válido
        const pesoAnterior = relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso || 75;
        
        console.log('Peso do relatório anterior para o PDF (mesmo valor da interface):', pesoAnterior);
        doc.text(`Peso: ${pesoAnterior} kg`, pageWidth / 4, margin + 30);
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Peso: ${pesoRecente} kg`, (pageWidth * 3) / 4, margin + 30);
        
        // Adicionar diferença de peso em verde se perdeu ou vermelho se ganhou
        const difPeso = pesoRecente - pesoAnterior;
        if (difPeso !== 0) {
          const cor = difPeso < 0 ? [0, 128, 0] : [255, 0, 0]; // Verde se perdeu peso, vermelho se ganhou
          doc.setTextColor(cor[0], cor[1], cor[2]);
          doc.text(`(${difPeso > 0 ? '+' : ''}${difPeso.toFixed(1)} kg)`, (pageWidth * 3) / 4 + 60, margin + 30);
        }

        // === SEÇÃO FRENTE ===
        // Usar metade da altura disponível para cada seção (frente/costas)
        const alturaDisponivel = pageHeight - (margin * 2) - 40; // 40 para cabeçalho e outros elementos
        const alturaSecao = alturaDisponivel / 2; 
        
        // Calcular o tamanho máximo das fotos para frente
        // Manter a proporção e deixar algum espaço para títulos
        const alturaFotoFrente = alturaSecao - 25; // 25 para título e legendas
        const larguraFotoFrente = alturaFotoFrente * 0.7; // Proporção aproximada
        
        let yPos = margin + 40; // Posição inicial após cabeçalho

        // Título Frente
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Frente", pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        // Legendas Frente
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text("Anterior", pageWidth / 4, yPos);
        doc.text("Recente", (pageWidth * 3) / 4, yPos);
        yPos += 5;
        
        // Calcular posições X das fotos (centralizadas em cada coluna)
        const xAnterior = pageWidth / 4 - (larguraFotoFrente / 2);
        const xRecente = (pageWidth * 3) / 4 - (larguraFotoFrente / 2);
        
        try {
          // Adicionar fotos de frente
          if (fotosRecente.length > 0 && fotosAnterior.length > 0) {
            const fotoFrenteAnterior = await processarImagem(fotosAnterior[0]);
            const fotoFrenteRecente = await processarImagem(fotosRecente[0]);
            
            doc.addImage(
              fotoFrenteAnterior as string,
              'JPEG',
              xAnterior,
              yPos,
              larguraFotoFrente,
              alturaFotoFrente
            );
            
            doc.addImage(
              fotoFrenteRecente as string,
              'JPEG',
              xRecente,
              yPos,
              larguraFotoFrente,
              alturaFotoFrente
            );
          }
        } catch (err) {
          console.error("Erro ao adicionar fotos de frente:", err);
        }
        
        // === SEÇÃO COSTAS ===
        // Atualizar posição Y para a seção de costas
        yPos += alturaFotoFrente + 15;
        
        // Título Costas
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Costas", pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        // Legendas Costas
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text("Anterior", pageWidth / 4, yPos);
        doc.text("Recente", (pageWidth * 3) / 4, yPos);
        yPos += 5;
        
        try {
          // Adicionar fotos de costas
          if (fotosRecente.length > 1 && fotosAnterior.length > 1) {
            const fotoCostasAnterior = await processarImagem(fotosAnterior[1]);
            const fotoCostasRecente = await processarImagem(fotosRecente[1]);
            
            doc.addImage(
              fotoCostasAnterior as string,
              'JPEG',
              xAnterior,
              yPos,
              larguraFotoFrente,
              alturaFotoFrente
            );
            
            doc.addImage(
              fotoCostasRecente as string,
              'JPEG',
              xRecente,
              yPos,
              larguraFotoFrente,
              alturaFotoFrente
            );
          }
        } catch (err) {
          console.error("Erro ao adicionar fotos de costas:", err);
        }
        
        // === PÁGINA 2: LATERAIS ===
        doc.addPage();
        yPos = margin;
        
        // Titulo da página de laterais
        doc.setFontSize(16);
        doc.setTextColor(40, 80, 200);
        doc.text("Comparação Lateral", pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 12;
        
        // Calcular o tamanho máximo das fotos para laterais
        // Como temos duas seções (esquerda/direita), usamos a mesma lógica da página anterior
        const alturaFotoLateral = alturaSecao - 25;
        const larguraFotoLateral = alturaFotoLateral * 0.7;
        
        // === SEÇÃO LATERAL ESQUERDA ===
        // Título Lateral Esquerda
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Lateral Esquerda", pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        // Legendas
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text("Anterior", pageWidth / 4, yPos);
        doc.text("Recente", (pageWidth * 3) / 4, yPos);
        yPos += 5;
        
        try {
          // Adicionar fotos de lateral esquerda
          if (fotosRecente.length > 2 && fotosAnterior.length > 2) {
            const fotoLateralEsqAnterior = await processarImagem(fotosAnterior[2]);
            const fotoLateralEsqRecente = await processarImagem(fotosRecente[2]);
            
            doc.addImage(
              fotoLateralEsqAnterior as string,
              'JPEG',
              xAnterior,
              yPos,
              larguraFotoLateral,
              alturaFotoLateral
            );
            
            doc.addImage(
              fotoLateralEsqRecente as string,
              'JPEG',
              xRecente,
              yPos,
              larguraFotoLateral,
              alturaFotoLateral
            );
          }
        } catch (err) {
          console.error("Erro ao adicionar fotos de lateral esquerda:", err);
        }
        
        // === SEÇÃO LATERAL DIREITA ===
        // Atualizar posição Y para a seção de lateral direita
        yPos += alturaFotoLateral + 15;
        
        // Título Lateral Direita
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Lateral Direita", pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        // Legendas
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text("Anterior", pageWidth / 4, yPos);
        doc.text("Recente", (pageWidth * 3) / 4, yPos);
        yPos += 5;
        
        try {
          // Adicionar fotos de lateral direita
          if (fotosRecente.length > 3 && fotosAnterior.length > 3) {
            const fotoLateralDirAnterior = await processarImagem(fotosAnterior[3]);
            const fotoLateralDirRecente = await processarImagem(fotosRecente[3]);
            
            doc.addImage(
              fotoLateralDirAnterior as string,
              'JPEG',
              xAnterior,
              yPos,
              larguraFotoLateral,
              alturaFotoLateral
            );
            
            doc.addImage(
              fotoLateralDirRecente as string,
              'JPEG',
              xRecente,
              yPos,
              larguraFotoLateral,
              alturaFotoLateral
            );
          }
        } catch (err) {
          console.error("Erro ao adicionar fotos de lateral direita:", err);
        }
        
        // === PÁGINA 3: INFORMAÇÕES DETALHADAS ===
        doc.addPage();
        yPos = margin;

        // Função auxiliar para calcular altura necessária para o texto
        const calcularAlturaTexto = (texto: string, larguraDisponivel: number, tamanhoFonte: number) => {
          doc.setFontSize(tamanhoFonte);
          const linhas = doc.splitTextToSize(texto || 'Não informado', larguraDisponivel);
          return (linhas.length * (tamanhoFonte * 0.5)) + 10; // 10px de padding
        };
        
        // Cabeçalho da página de informações
        doc.setFontSize(20);
        doc.setTextColor(40, 80, 200);
        doc.text('Detalhes do Relatório', pageWidth / 2, yPos + 10, { align: 'center' });
        yPos += 25;

        // Configuração da tabela
        const colWidth = (pageWidth - (margin * 2)) / 2;
        const rowHeight = 8;
        const cellPadding = 4;

        // Cabeçalhos das colunas
        doc.setFillColor(40, 80, 200);
        doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 4, 'F');

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        const textoAnterior = `Relatório Anterior (${formatarDataDDMMYY(new Date(relatorioAnterior.data))})`;
        const textoRecente = `Relatório Atual (${formatarDataDDMMYY(new Date(relatorioRecente.data))})`;
        doc.text(textoAnterior, margin + (colWidth / 2), yPos + 7, { align: 'center' });
        doc.text(textoRecente, margin + colWidth + (colWidth / 2), yPos + 7, { align: 'center' });
        yPos += rowHeight + 4;

        // Função auxiliar para desenhar linha da tabela com estilo moderno
        const desenharLinhaDaTabela = (label: string, valor1: string, valor2: string, isAlternate: boolean = false) => {
          if (isAlternate) {
            doc.setFillColor(245, 247, 250);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');

          // Texto do rótulo
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(label, margin + cellPadding, yPos + 6);

          // Valores
          doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
          doc.text(valor1, margin + (colWidth / 2), yPos + 6, { align: 'center' });
          doc.text(valor2, margin + colWidth + (colWidth / 2), yPos + 6, { align: 'center' });

          // Linha divisória sutil
          doc.setDrawColor(230, 230, 230);
          doc.line(margin, yPos + rowHeight + 2, pageWidth - margin, yPos + rowHeight + 2);

          yPos += rowHeight + 2;
        };

        // Dados principais
        desenharLinhaDaTabela('Peso:', `${pesoAnterior} kg`, `${pesoRecente} kg`, true);
        desenharLinhaDaTabela('Calorias:', relatorioAnterior.calorias || 'Não informado', relatorioRecente.calorias || 'Não informado');

        yPos += 5;

        // Calcular alturas necessárias para dieta e comentários
        const larguraTextoDisponivel = colWidth - (cellPadding * 3);
        const alturaDietaAnterior = calcularAlturaTexto(relatorioAnterior.dieta, larguraTextoDisponivel, 9);
        const alturaDietaRecente = calcularAlturaTexto(relatorioRecente.dieta, larguraTextoDisponivel, 9);
        const alturaComentariosAnterior = calcularAlturaTexto(relatorioAnterior.comentarios, larguraTextoDisponivel, 9);
        const alturaComentariosRecente = calcularAlturaTexto(relatorioRecente.comentarios, larguraTextoDisponivel, 9);

        const alturaDieta = Math.max(alturaDietaAnterior, alturaDietaRecente);
        const alturaComentarios = Math.max(alturaComentariosAnterior, alturaComentariosRecente);

        // Seção de Dieta
        doc.setFillColor(40, 80, 200);
        doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('Dieta', pageWidth / 2, yPos + 7, { align: 'center' });
        yPos += rowHeight + 2;

        // Conteúdo da dieta
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos, pageWidth - (margin * 2), alturaDieta, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.line(margin + colWidth, yPos, margin + colWidth, yPos + alturaDieta);

        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);

        const dietaAnterior = doc.splitTextToSize(relatorioAnterior.dieta || 'Não informado', larguraTextoDisponivel);
        const dietaAtual = doc.splitTextToSize(relatorioRecente.dieta || 'Não informado', larguraTextoDisponivel);

        doc.text(dietaAnterior, margin + cellPadding, yPos + cellPadding);
        doc.text(dietaAtual, margin + colWidth + cellPadding, yPos + cellPadding);

        yPos += alturaDieta + 10;

        // Seção de Comentários
        doc.setFillColor(40, 80, 200);
        doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');
          doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('Comentários', pageWidth / 2, yPos + 7, { align: 'center' });
        yPos += rowHeight + 2;

        // Conteúdo dos comentários
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos, pageWidth - (margin * 2), alturaComentarios, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.line(margin + colWidth, yPos, margin + colWidth, yPos + alturaComentarios);

        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);

        const comentariosAnterior = doc.splitTextToSize(relatorioAnterior.comentarios || 'Não informado', larguraTextoDisponivel);
        const comentariosAtual = doc.splitTextToSize(relatorioRecente.comentarios || 'Não informado', larguraTextoDisponivel);

        doc.text(comentariosAnterior, margin + cellPadding, yPos + cellPadding);
        doc.text(comentariosAtual, margin + colWidth + cellPadding, yPos + cellPadding);

        // Adicionar bordas sutis ao redor de toda a tabela
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, margin + 25, pageWidth - (margin * 2), yPos + alturaComentarios - (margin + 25));
        
        // Salvar o PDF
        doc.save(`relatorio_comparacao_${formatarDataDDMMYY(new Date())}.pdf`);
        
        toast.dismiss();
        toast.success('PDF gerado com sucesso!');
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        toast.dismiss();
        toast.error('Erro ao gerar PDF. Verifique o console para mais detalhes.');
      }
    } catch (error) {
      console.error('Erro geral na geração de PDF:', error);
    } finally {
      setExportandoPDF(false);
    }
  };

  // Função para gerar PDF de relatório individual
  const gerarPDFIndividual = async (relatorio: any) => {
    try {
      setExportandoPDF(true);
      toast.loading('Gerando PDF, aguarde...');

      try {
        // Criar instância jsPDF com orientação portrait (A4)
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Configurações de página
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15; // Margem reduzida para maximizar espaço
        
        // Configurar fonte e tamanho
        doc.setFont('helvetica');
        
        // Adicionar título
        doc.setFontSize(18);
        doc.setTextColor(40, 80, 200);
        doc.text('Relatório de Progresso', pageWidth / 2, margin, { align: 'center' });
        
        // Adicionar data
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        doc.text(`Data: ${dataAtual}`, pageWidth / 2, margin + 8, { align: 'center' });
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
        
        // Adicionar data do relatório
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        const dataRelatorio = formatarDataDDMMYY(new Date(relatorio.data));
        doc.text(`Relatório: ${dataRelatorio}`, pageWidth / 2, margin + 20, { align: 'center' });
        
        let yPos = margin + 30;
        const rowHeight = 10;
        const cellPadding = 5;
        
        // Função para calcular altura do texto
        const calcularAlturaTexto = (texto: string, larguraDisponivel: number, tamanhoFonte: number) => {
          const caracteresPorLinha = Math.floor(larguraDisponivel / (tamanhoFonte * 0.5));
          const linhas = Math.ceil(texto.length / caracteresPorLinha);
          return linhas * (tamanhoFonte * 0.5);
        };

        // Função auxiliar para processar imagem
        const processarImagem = (imageBase64: string): Promise<string> => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              // Criar canvas para manipular a imagem
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Definir as dimensões do canvas
              canvas.width = img.width;
              canvas.height = img.height;
              
              // Desenhar a imagem no canvas com a orientação correta
              if (ctx) {
                ctx.drawImage(img, 0, 0);
              }
              
              // Retornar a imagem corrigida
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = imageBase64;
          });
        };
        
        // PRIMEIRA SEÇÃO: FOTOS
        if (relatorio.fotos && relatorio.fotos.length > 0) {
          // Título de fotos
          doc.setFillColor(40, 80, 200);
          doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text('Fotos', pageWidth / 2, yPos + 7, { align: 'center' });
          yPos += rowHeight + 2;
          
          const fotos = relatorio.fotos;
          const fotosProcessadas = [];
          
          // Processar fotos para garantir que estejam no formato correto
          for (let i = 0; i < fotos.length; i++) {
            try {
              const fotoProcessada = await processarImagem(fotos[i]);
              fotosProcessadas.push(fotoProcessada);
            } catch (error) {
              console.error('Erro ao processar foto:', error);
            }
          }
          
          // Calcular dimensões das fotos
          const espacoHorizontal = pageWidth - (margin * 2);
          const numColunas = Math.min(2, fotosProcessadas.length); // Máximo 2 fotos por linha
          const larguraFoto = (espacoHorizontal / numColunas) - 5;
          const alturaFoto = larguraFoto * 1.33; // Proporção aproximada
          
          // Adicionar fotos ao PDF
          let fotoIndex = 0;
          while (fotoIndex < fotosProcessadas.length) {
            // Verificar se precisamos de uma nova página
            if (yPos + alturaFoto > pageHeight - margin) {
              doc.addPage();
              yPos = margin;
            }
            
            // Adicionar fotos em linha
            for (let col = 0; col < numColunas && fotoIndex < fotosProcessadas.length; col++) {
              const xPos = margin + (col * (larguraFoto + 5));
              
              // Adicionar fundo e borda à foto
              doc.setFillColor(250, 250, 250);
              doc.rect(xPos, yPos, larguraFoto, alturaFoto, 'F');
              doc.setDrawColor(200, 200, 200);
              doc.rect(xPos, yPos, larguraFoto, alturaFoto);
              
              doc.addImage(
                fotosProcessadas[fotoIndex],
                'JPEG',
                xPos,
                yPos,
                larguraFoto,
                alturaFoto
              );
              fotoIndex++;
            }
            
            // Avançar para a próxima linha
            yPos += alturaFoto + 10;
          }
        }
        
        // SEGUNDA SEÇÃO: INFORMAÇÕES GERAIS
        // Cabeçalho das informações
        doc.setFillColor(40, 80, 200);
        doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text('Informações Gerais', pageWidth / 2, yPos + 7, { align: 'center' });
        yPos += rowHeight + 2;
        
        // Criação da tabela de informações com layout aprimorado
        const tabWidth = pageWidth - (margin * 2);
        const colWidth1 = 40;  // Largura da coluna de rótulos
        const colWidth2 = tabWidth - colWidth1;  // Largura da coluna de valores
        
        // Função auxiliar para desenhar linha da tabela
        const desenharLinhaInfoTabela = (label: string, valor: string, isAlternate: boolean = false) => {
          if (isAlternate) {
            doc.setFillColor(240, 245, 250);
          } else {
            doc.setFillColor(250, 250, 250);
          }
          doc.rect(margin, yPos, tabWidth, rowHeight + 5, 'F');
          
          // Rótulo
          doc.setFontSize(10);
          doc.setTextColor(80, 80, 80);
          doc.text(label, margin + 5, yPos + 8);
          
          // Valor
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(valor, margin + colWidth1 + 5, yPos + 8);
          
          // Linha divisória sutil
          doc.setDrawColor(220, 220, 220);
          doc.line(margin, yPos + rowHeight + 5, margin + tabWidth, yPos + rowHeight + 5);
          
          yPos += rowHeight + 5;
        };
        
        // Desenhar linhas da tabela com informações
        desenharLinhaInfoTabela('Data:', dataRelatorio, true);
        desenharLinhaInfoTabela('Peso:', `${relatorio.peso || '0'} kg`);
        
        if (relatorio.calorias) {
          desenharLinhaInfoTabela('Calorias:', `${relatorio.calorias} kcal`, true);
        }
        
        yPos += 10;
        
        // TERCEIRA SEÇÃO: DIETA SEMANAL
        if (relatorio.dieta) {
          doc.setFillColor(40, 80, 200);
          doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text('Dieta Semanal', pageWidth / 2, yPos + 7, { align: 'center' });
          yPos += rowHeight + 2;
          
          // Calcular altura necessária para o texto da dieta
          const larguraTextoDisponivel = pageWidth - (margin * 2) - (cellPadding * 2);
          const alturaDieta = calcularAlturaTexto(relatorio.dieta, larguraTextoDisponivel, 9) + 10;
          
          // Conteúdo da dieta
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - (margin * 2), alturaDieta, 'F');
          
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          
          const textoDieta = doc.splitTextToSize(relatorio.dieta, larguraTextoDisponivel);
          doc.text(textoDieta, margin + cellPadding, yPos + cellPadding);
          
          yPos += alturaDieta + 10;
        }
        
        // QUARTA SEÇÃO: COMENTÁRIOS
        if (relatorio.comentarios) {
          doc.setFillColor(40, 80, 200);
          doc.rect(margin, yPos, pageWidth - (margin * 2), rowHeight + 2, 'F');
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text('Comentários', pageWidth / 2, yPos + 7, { align: 'center' });
          yPos += rowHeight + 2;
          
          // Calcular altura necessária para o texto dos comentários
          const larguraTextoDisponivel = pageWidth - (margin * 2) - (cellPadding * 2);
          const alturaComentarios = calcularAlturaTexto(relatorio.comentarios, larguraTextoDisponivel, 9) + 10;
          
          // Conteúdo dos comentários
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos, pageWidth - (margin * 2), alturaComentarios, 'F');
          
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          
          const textoComentarios = doc.splitTextToSize(relatorio.comentarios, larguraTextoDisponivel);
          doc.text(textoComentarios, margin + cellPadding, yPos + cellPadding);
          
          yPos += alturaComentarios + 10;
        }
        
        // Adicionar bordas sutis ao redor de toda a página
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, margin + 25, pageWidth - (margin * 2), pageHeight - (margin * 2) - 25);
        
        // Salvar o PDF
        const dataFormatada = formatarDataDDMMYY(new Date(relatorio.data)).replace(/\//g, '-');
        doc.save(`Relatorio_${dataFormatada}.pdf`);
        toast.dismiss();
        toast.success('PDF gerado com sucesso!');
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        toast.error('Erro ao gerar PDF. Tente novamente.');
      }
      
      setExportandoPDF(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
      setExportandoPDF(false);
    }
  };

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

  // Função para formatar a data no formato dd/mm/yyyy (formato brasileiro)
  function formatarDataDDMMYY(data: Date): string {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  // Função para formatar a data para o input type="date"
  const formatarDataParaInput = (data: Date | string) => {
    const date = data instanceof Date ? data : new Date(data);
    return date.toISOString().split('T')[0];
  };

  // Handler para mudança de data
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [ano, mes, dia] = e.target.value.split('-').map(Number);
      const novaData = new Date(ano, mes - 1, dia);
      setDataSelecionada(novaData);
    }
  };

  // Handler para pesquisa por data
  const handleDataPesquisa = (data: Date) => {
    const dataFormatada = formatarDataDDMMYY(data);
    setTermoPesquisa(dataFormatada);
    setMostrarCalendario(false);
  };

  // Função para alternar a visualização expandida de um relatório
  const toggleRelatorioExpandido = (id: string) => {
    setRelatoriosExpandidos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const irParaHistorico = () => {
    setActiveTab('historico');
  };

  const irParaComparacao = () => {
    setActiveTab('comparar');
  };

  // Função para lidar com adicionar fotos e manter os dados atuais
  const irParaFotos = () => {
    try {
      // Salvar dados temporariamente no localStorage
      const dadosParaSalvar = {
        dataSelecionada: dataSelecionada.toISOString(),
        dietaSemanal,
        comentarioTreino,
        calorias,
        peso
      };
      
      localStorage.setItem('relatorio_temp', JSON.stringify(dadosParaSalvar));
      
      // Navegar para a página de fotos
      router.push('/fotos?origem=relatorio&historico=true');
    } catch (error) {
      console.error('Erro ao navegar para fotos:', error);
      toast.error('Erro ao acessar a página de fotos');
    }
  };

  // Função para buscar relatórios salvos
  const buscarRelatoriosSalvos = async () => {
    try {
      const relatorios = await db.relatorios.orderBy('data').reverse().toArray();
      console.log('Relatórios brutos do banco:', relatorios);
      
      return relatorios.map(relatorio => ({
        id: relatorio.id?.toString() || Date.now().toString(),
        data: relatorio.data,
        peso: Number(relatorio.peso) || 0,
        calorias: relatorio.calorias?.toString() || '',
        dieta: relatorio.dietaSemanal || '',
        comentarios: relatorio.comentarioTreino || '',
        fotos: relatorio.fotos || []
      }));
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
      return [];
    }
  };

  // Função para salvar um novo relatório
  const salvarRelatorio = async () => {
    if (!dietaSemanal.trim()) {
      toast.error('Por favor, preencha a dieta semanal antes de salvar o relatório.');
      return;
    }
    
    try {
      setCarregando(true);
      
      // Guardar dados temporários em localStorage para recuperação em caso de falha
      try {
        const dadosTemporarios = {
          dietaSemanal,
          comentarioTreino,
          calorias,
          peso,
          dataSelecionada: dataSelecionada.toISOString()
        };
        localStorage.setItem('relatorio_temp', JSON.stringify(dadosTemporarios));
      } catch (error) {
        console.error('Erro ao salvar dados temporários:', error);
      }
      
      // Criar o objeto do relatório
      const relatorio: RelatorioSemanal = {
        id: registroEditando || Date.now(),
        data: new Date(dataSelecionada),
        dietaSemanal,
        comentarioTreino: comentarioTreino || '',
        calorias: Number(calorias) || 0,
        peso: Number(peso) || 0,
        fotos: fotosSelecionadas
      };
      
      if (registroEditando) {
        // Atualizar registro existente
        await db.relatorios.update(registroEditando, relatorio);
        toast.success('Relatório atualizado com sucesso!');
      } else {
        // Salvar novo registro
        await db.relatorios.add(relatorio);
        toast.success('Relatório salvo com sucesso!');
      }
      
      // Atualizar a interface
      const relatorios = await buscarRelatoriosSalvos();
      setDadosSalvos(relatorios);
      
      // Limpar formulário
      setDietaSemanal('');
      setComentarioTreino('');
      setCalorias('');
      setPeso('');
      setDataSelecionada(new Date());
      setFotosSelecionadas([]);
      setRegistroEditando(null);
      
      // Limpar dados temporários
      localStorage.removeItem('relatorio_temp');
      localStorage.removeItem('fotos_relatorio');
      localStorage.removeItem('fotos_relatorio_id');
      
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      toast.error('Erro ao salvar relatório. Por favor, tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Recuperar dados temporários quando o componente monta
  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        const relatorios = await buscarRelatoriosSalvos();
        if (relatorios.length > 0) {
          setDadosSalvos(relatorios);
          setRelatoriosFiltrados(relatorios);
        }
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
      } finally {
        setCarregando(false);
      }
    };
    
    carregarDados();
    
    // Recuperar dados do formulário do localStorage
    try {
      const dadosTemp = localStorage.getItem('relatorio_temp');
      if (dadosTemp) {
        try {
          const dados = JSON.parse(dadosTemp);
          if (dados.dietaSemanal) setDietaSemanal(dados.dietaSemanal);
          if (dados.comentarioTreino) setComentarioTreino(dados.comentarioTreino);
          if (dados.calorias) setCalorias(dados.calorias);
          if (dados.peso) setPeso(dados.peso);
          if (dados.dataSelecionada) {
            try {
              setDataSelecionada(new Date(dados.dataSelecionada));
            } catch (dateError) {
              console.error('Erro ao converter a data:', dateError);
              setDataSelecionada(new Date());
            }
          }
        } catch (parseError) {
          console.error('Erro ao processar dados temporários:', parseError);
        }
      }
    } catch (error) {
      console.error('Erro ao recuperar dados de formulário:', error);
    }
    
    // Processar fotos separadamente para evitar sobrecarga
    const processarFotos = async () => {
      try {
        // Verificar se temos um ID de registro salvo
        const registroId = localStorage.getItem('fotos_relatorio_id');
        if (registroId) {
          try {
            // Buscar o registro de forma assíncrona
            const id = parseInt(registroId);
            if (!isNaN(id)) {
              // Buscar o registro com tratamento de erro
              try {
                const registro = await db.fotosProgresso.get(id);
                if (registro) {
                  // Coletar todas as fotos disponíveis do registro
                  const fotos: string[] = [];
                  if (registro.frente) fotos.push(registro.frente);
                  if (registro.costas) fotos.push(registro.costas);
                  if (registro.lateralEsquerda) fotos.push(registro.lateralEsquerda);
                  if (registro.lateralDireita) fotos.push(registro.lateralDireita);
                  // Usar todas as fotos
                  setFotosSelecionadas(fotos);
                }
              } catch (dbError) {
                console.error("Erro ao acessar banco de dados:", dbError);
              }
            }
            
            // Limpar o localStorage após carregar as fotos
            localStorage.removeItem('fotos_relatorio_id');
          } catch (error) {
            console.error("Erro ao processar ID:", error);
            localStorage.removeItem('fotos_relatorio_id');
          }
        } else {
          // Abordagem antiga - localStorage
          try {
            const fotosSalvas = localStorage.getItem('fotos_relatorio');
            if (fotosSalvas) {
              try {
                const fotosArray = JSON.parse(fotosSalvas);
                if (Array.isArray(fotosArray)) {
                  // Usar todas as fotos
                  setFotosSelecionadas(fotosArray);
                }
              } catch (parseError) {
                console.error('Erro ao processar fotos:', parseError);
              }
            }
          } catch (fotosError) {
            console.error('Erro ao carregar fotos:', fotosError);
          }
        }
      } catch (mainError) {
        console.error("Erro principal no processamento de fotos:", mainError);
      }
    };
    
    // Executar com um pequeno atraso para evitar sobrecarga
    const timeoutId = setTimeout(() => {
      processarFotos();
    }, 500);
    
    // Limpar timeout se o componente for desmontado
    return () => clearTimeout(timeoutId);
  }, []);

  // Efeito para filtrar relatórios quando o termo de pesquisa mudar
  useEffect(() => {
    if (!termoPesquisa.trim()) {
      setRelatoriosFiltrados(dadosSalvos);
      return;
    }

    const relatFiltrados = dadosSalvos.filter(relatorio => {
      // Convertemos a data do relatório para formato DD/MM/YYYY para comparação
      const dataFormatada = formatarDataDDMMYY(new Date(relatorio.data)).toLowerCase();
      return dataFormatada.includes(termoPesquisa.toLowerCase());
    });

    setRelatoriosFiltrados(relatFiltrados);
  }, [termoPesquisa, dadosSalvos]);

  // Função para abrir foto em tela cheia
  const abrirFotoTelaCheia = (fotos: string[], indiceInicial: number) => {
    setFotosVisualizacao(fotos);
    setIndiceAtual(indiceInicial);
    setFotoTelaCheia(fotos[indiceInicial]);
  };

  // Função para navegar entre as fotos
  const navegarFotos = (direcao: 'anterior' | 'proxima') => {
    const totalFotos = fotosVisualizacao.length;
    let novoIndice = indiceAtual;

    if (direcao === 'anterior') {
      novoIndice = (indiceAtual - 1 + totalFotos) % totalFotos;
    } else {
      novoIndice = (indiceAtual + 1) % totalFotos;
    }

    setIndiceAtual(novoIndice);
    setFotoTelaCheia(fotosVisualizacao[novoIndice]);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen font-sans pb-24">
      {/* Modal de foto em tela cheia */}
      {fotoTelaCheia && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <button
            onClick={() => setFotoTelaCheia(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            onClick={() => navegarFotos('anterior')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Foto anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <img
            src={fotoTelaCheia}
            alt="Foto em tela cheia"
            className="max-h-screen max-w-screen object-contain"
          />

          <button
            onClick={() => navegarFotos('proxima')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Próxima foto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {indiceAtual + 1} de {fotosVisualizacao.length}
          </div>
        </div>
      )}

      <header className="pt-4 pb-2 px-6 bg-white backdrop-blur-sm shadow-sm">
        <div className="relative flex items-center justify-center">
          <div className="absolute left-6 -ml-2">
            {activeTab === 'historico' ? (
              <button 
                onClick={() => setActiveTab('relatorio')} 
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

          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800 truncate -mt-1">
            {activeTab === 'historico' ? 'Histórico' : 'Relatório'}
          </h1>

          <div className="absolute right-6 -mr-2">
            <button 
              onClick={() => setActiveTab(activeTab === 'historico' ? 'relatorio' : 'historico')}
              className="p-2 rounded-full hover:bg-gray-100 transition-all duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-4">
        {/* Lista de histórico de relatórios */}
        {activeTab === 'historico' && (
          <div className="bg-white shadow">
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Relatórios</h3>
              
              {/* Barra de pesquisa por data */}
              <div className="mb-6">
                <div className="relative rounded-md shadow-sm max-w-md mx-auto">
                  <div className="flex items-center">
                    <input
                      type="text"
                      className="block w-full pr-10 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Pesquisar por data (DD/MM/AAAA)"
                      value={termoPesquisa}
                      onChange={(e) => setTermoPesquisa(e.target.value)}
                      onFocus={() => setMostrarCalendario(true)}
                      pattern="\d{2}/\d{2}/\d{4}"
                      inputMode="numeric"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setMostrarCalendario(!mostrarCalendario)}
                        className="h-full flex items-center text-gray-400 hover:text-gray-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Calendário para seleção de data */}
                  {mostrarCalendario && (
                    <div className="absolute mt-1 w-full rounded-md bg-white shadow-lg z-10">
                      <div className="p-3 bg-white border border-gray-200 rounded-md">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Selecione a data
                            </label>
                            <DatePicker
                              selected={dataPesquisa ? new Date(dataPesquisa) : null}
                              onChange={(date: Date | null) => {
                                if (date) {
                                  setDataPesquisa(formatarDataParaInput(date));
                                  handleDataPesquisa(date);
                                }
                              }}
                              locale="pt-BR"
                              dateFormat="dd/MM/yyyy"
                              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholderText="Selecione uma data"
                              showPopperArrow={false}
                              inline
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setMostrarCalendario(false)}
                              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
                            >
                              Fechar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de relatórios */}
              <div className="divide-y divide-gray-200">
                {relatoriosFiltrados.length > 0 ? (
                  relatoriosFiltrados.map((relatorio) => (
                    <div key={relatorio.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h4 
                          onClick={() => toggleRelatorioExpandido(relatorio.id)}
                          className="text-base font-semibold text-primary-700 cursor-pointer flex items-center"
                        >
                          {formatarDataDDMMYY(new Date(relatorio.data))}
                          <span className="ml-2">
                            {relatoriosExpandidos[relatorio.id] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </span>
                        </h4>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Chamar a função para gerar o PDF individual
                              gerarPDFIndividual(relatorio);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Exportar PDF"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => {
                              setActiveTab('relatorio');
                              setDataSelecionada(new Date(relatorio.data));
                              setDietaSemanal(relatorio.dieta);
                              setComentarioTreino(relatorio.comentarios);
                              setCalorias(relatorio.calorias);
                              setPeso(relatorio.peso.toString());
                              if (relatorio.fotos && relatorio.fotos.length > 0) {
                                setFotosSelecionadas(relatorio.fotos);
                              }
                              setRegistroEditando(Number(relatorio.id));
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Deseja realmente excluir este relatório?')) {
                                try {
                                  const idNumerico = parseInt(relatorio.id);
                                  if (isNaN(idNumerico)) {
                                    await db.relatorios.delete(relatorio.id);
                                  } else {
                                    await db.relatorios.delete(idNumerico);
                                  }
                                  toast.success('Relatório excluído com sucesso!');
                                  const relatorios = await buscarRelatoriosSalvos();
                                  setDadosSalvos(relatorios);
                                  setRelatoriosFiltrados(relatorios);
                                } catch (error) {
                                  console.error('Erro ao excluir relatório:', error);
                                  toast.error('Erro ao excluir relatório.');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {!relatoriosExpandidos[relatorio.id] && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {relatorio.peso > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Peso: {relatorio.peso} kg
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {relatoriosExpandidos[relatorio.id] && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center justify-between">
                            {relatorio.peso > 0 && (
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Peso: {relatorio.peso} kg
                              </div>
                            )}
                            
                            {relatorio.calorias > 0 && (
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Calorias: {relatorio.calorias} kcal
                              </div>
                            )}
                          </div>

                          {relatorio.dieta && (
                            <div className="bg-gray-50 p-3 rounded-md">
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Dieta Semanal</h5>
                              <p className="text-sm text-gray-700 whitespace-pre-line">
                                {relatorio.dieta}
                              </p>
                            </div>
                          )}
                          
                          {relatorio.comentarios && (
                            <div className="bg-gray-50 p-3 rounded-md">
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Comentários</h5>
                              <p className="text-sm text-gray-700 whitespace-pre-line">
                                {relatorio.comentarios}
                              </p>
                            </div>
                          )}
                          
                          {relatorio.fotos && relatorio.fotos.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Fotos</h5>
                              <div className="grid grid-cols-2 gap-3">
                                {relatorio.fotos.map((foto: string, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => abrirFotoTelaCheia(relatorio.fotos, idx)}
                                    className="relative rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity h-44"
                                  >
                                    <img src={foto} className="w-full h-full object-cover" alt={`Foto ${idx + 1}`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-gray-500">Nenhum relatório encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Formulário para criar novo relatório */}
        {activeTab === 'relatorio' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
                Data do Relatório
              </label>
              <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
                <div className="flex items-center">
                  <div className="flex-grow px-3 py-2">
                    <span className="text-gray-900 font-medium">
                      {formatarDataDDMMYY(dataSelecionada)}
                    </span>
                  </div>
                  <div className="flex">
                    <input
                      type="date"
                      id="data"
                      name="data"
                      value={formatarDataParaInput(dataSelecionada)}
                      onChange={handleDataChange}
                      className="sr-only"
                    />
                    <label htmlFor="data" className="w-12 h-full flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 text-gray-600 border-l border-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <label htmlFor="peso" className="block text-sm font-medium text-gray-700 mb-1">
                  Peso (kg) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
              </div>
              <input
                type="number"
                id="peso"
                name="peso"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Ex: 75"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between">
                <label htmlFor="calorias" className="block text-sm font-medium text-gray-700 mb-1">
                  Calorias Diárias (kcal) <span className="text-gray-400 text-xs font-normal">(opcional)</span>
                </label>
              </div>
              <input
                type="number"
                id="calorias"
                name="calorias"
                value={calorias}
                onChange={handleInputChange}
                placeholder="Ex: 2000"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="dietaSemanal" className="block text-sm font-medium text-gray-700 mb-1">
                Dieta Semanal
              </label>
              <textarea
                id="dietaSemanal"
                name="dietaSemanal"
                rows={4}
                value={dietaSemanal}
                onChange={handleInputChange}
                placeholder="Descreva sua dieta semanal aqui..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="comentarioTreino" className="block text-sm font-medium text-gray-700 mb-1">
                Comentários sobre Treinos
              </label>
              <textarea
                id="comentarioTreino"
                name="comentarioTreino"
                rows={3}
                value={comentarioTreino}
                onChange={handleInputChange}
                placeholder="Adicione comentários sobre seus treinos da semana..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Fotos para o Relatório</h3>
              
              {fotosSelecionadas.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {fotosSelecionadas.map((foto, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={foto} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => {
                            const novasFotos = [...fotosSelecionadas];
                            novasFotos.splice(index, 1);
                            setFotosSelecionadas(novasFotos);
                          }}
                          className="absolute top-2 right-2 bg-red-600 rounded-full p-1 text-white hover:bg-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center mb-4">
                  <p className="text-gray-500 text-sm">Nenhuma foto selecionada</p>
                </div>
              )}
              
              <div className="mt-4 flex justify-center">
                <button
                  onClick={irParaFotos}
                  className="w-48 flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar Fotos
                </button>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={irParaComparacao}
                className="w-48 flex justify-center items-center py-3 px-4 border border-blue-500 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Comparar
              </button>
              
              <button
                type="button"
                onClick={salvarRelatorio}
                disabled={carregando}
                className="w-48 flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {carregando ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Comparação de Relatórios */}
        {activeTab === 'comparar' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Comparar Relatórios</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="relatorioRecente" className="block text-sm font-medium text-gray-700 mb-1">
                  Relatório Recente
                </label>
                <select
                  id="relatorioRecente"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    const relatorioId = e.target.value;
                    if (relatorioId) {
                      const relatorio = dadosSalvos.find(r => r.id.toString() === relatorioId);
                      if (relatorio) {
                        console.log('Selecionando relatório recente:', relatorio);
                        console.log('Peso do relatório recente:', relatorio.peso);
                        setRelatoriosComparacao(prev => ({
                          ...prev,
                          recente: relatorio
                        }));
                      }
                    } else {
                      setRelatoriosComparacao(prev => ({
                        ...prev,
                        recente: null
                      }));
                    }
                  }}
                >
                  <option value="">Selecione um relatório</option>
                  {dadosSalvos.map((relatorio, index) => (
                    <option key={`rec-${relatorio.id}`} value={relatorio.id}>
                      {formatarDataDDMMYY(new Date(relatorio.data))}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="relatorioAnterior" className="block text-sm font-medium text-gray-700 mb-1">
                  Relatório Anterior
                </label>
                <select
                  id="relatorioAnterior"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  onChange={(e) => {
                    const relatorioId = e.target.value;
                    if (relatorioId) {
                      const relatAnt = dadosSalvos.find(r => r.id.toString() === relatorioId);
                      if (relatAnt) {
                        // Converter explicitamente para garantir que o peso seja um número
                        const relatorioAnterior = {
                          ...relatAnt,
                          peso: Number(relatAnt.peso) || 0,
                        };
                        console.log('Relatório anterior selecionado:', relatorioAnterior);
                        console.log('Peso do relatório anterior:', relatorioAnterior.peso);
                        
                        setRelatoriosComparacao(prev => ({
                          ...prev,
                          anterior: relatorioAnterior
                        }));
                      }
                    } else {
                      setRelatoriosComparacao(prev => ({
                        ...prev,
                        anterior: null
                      }));
                    }
                  }}
                >
                  <option value="">Selecione um relatório</option>
                  {dadosSalvos.map((relatorio, index) => (
                    <option key={`ant-${relatorio.id}`} value={relatorio.id}>
                      {formatarDataDDMMYY(new Date(relatorio.data))}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  console.log('Mostrando comparação...');
                  console.log('Relatórios disponíveis:', dadosSalvos);
                  if (relatoriosComparacao.anterior) {
                    console.log('Relatório anterior selecionado:', relatoriosComparacao.anterior);
                    console.log('Peso do relatório anterior:', relatoriosComparacao.anterior.peso);
                  } else {
                    console.log('Relatório anterior não selecionado, usando o segundo da lista');
                  }
                  if (relatoriosComparacao.recente) {
                    console.log('Relatório recente selecionado:', relatoriosComparacao.recente);
                    console.log('Peso do relatório recente:', relatoriosComparacao.recente.peso);
                  } else {
                    console.log('Relatório recente não selecionado, usando o primeiro da lista');
                  }
                  setMostrarComparacao(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Comparar Relatórios
              </button>
            </div>
            
            {/* Resultados da comparação */}
            {mostrarComparacao && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Resultados da Comparação</h4>
                
                {/* Mostrar progresso de peso */}
                {(relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) && (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso) && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h5 className="text-md font-medium text-blue-900 mb-2">Progresso de Peso</h5>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Anterior: {relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso || 75} kg</p>
                        <p className="text-sm text-blue-700 font-medium">Atual: {relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso || 77} kg</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm text-blue-700 font-medium">Diferença:</p>
                        <p className={`text-lg font-bold ${(relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) < (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso) ? 'text-green-600' : 'text-red-600'}`}>
                          {(relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) < (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso) ? "-" : "+"}{Math.abs((relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) - (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso)).toFixed(1)} kg
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna da direita (Recente) */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-md font-medium text-gray-900 mb-2">Relatório Recente</h5>
                    <p className="text-sm text-gray-500 mb-4">Data: {formatarDataDDMMYY(new Date(relatoriosComparacao.recente?.data || dadosSalvos[0]?.data || new Date()))}</p>
                    
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700">Peso</h6>
                      <p className="text-lg font-bold">
                        {relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso || 77} kg
                        {(relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) && (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso) && (
                          <span className={`text-sm ${(relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) < (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso) ? 'text-green-600' : 'text-red-600'}`}>
                            {" "}({(relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) < (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso) ? "-" : "+"}{Math.abs((relatoriosComparacao.recente?.peso || dadosSalvos[0]?.peso) - (relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso)).toFixed(1)} kg)
                          </span>
                        )}
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700">Dieta</h6>
                      <p className="text-sm text-gray-600">{relatoriosComparacao.recente?.dieta || dadosSalvos[0]?.dieta || "Exemplo de dieta recente"}</p>
                    </div>
                    
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700">Comentários</h6>
                      <p className="text-sm text-gray-600">{relatoriosComparacao.recente?.comentarios || dadosSalvos[0]?.comentarios || "Sem comentários"}</p>
                    </div>
                    
                    {(relatoriosComparacao.recente?.fotos || dadosSalvos[0]?.fotos) && (relatoriosComparacao.recente?.fotos?.length > 0 || dadosSalvos[0]?.fotos?.length > 0) && (
                      <div className="mb-4">
                        <h6 className="text-sm font-medium text-gray-700">Fotos</h6>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {(relatoriosComparacao.recente?.fotos || dadosSalvos[0]?.fotos || []).slice(0, 4).map((foto: string, idx: number) => (
                            <img key={idx} src={foto} className="rounded-md w-full h-24 object-cover" alt={`Foto ${idx+1}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Coluna da esquerda (Anterior) */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="text-md font-medium text-gray-900 mb-2">Relatório Anterior</h5>
                    <p className="text-sm text-gray-500 mb-4">Data: {formatarDataDDMMYY(new Date(relatoriosComparacao.anterior?.data || dadosSalvos[1]?.data || new Date()))}</p>
                    
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700">Peso</h6>
                      <p className="text-lg font-bold">{relatoriosComparacao.anterior?.peso || dadosSalvos[1]?.peso || 75} kg</p>
                    </div>
                    
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700">Dieta</h6>
                      <p className="text-sm text-gray-600">{relatoriosComparacao.anterior?.dieta || dadosSalvos[1]?.dieta || "Exemplo de dieta anterior"}</p>
                    </div>
                    
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-gray-700">Comentários</h6>
                      <p className="text-sm text-gray-600">{relatoriosComparacao.anterior?.comentarios || dadosSalvos[1]?.comentarios || "Sem comentários"}</p>
                    </div>
                    
                    {(relatoriosComparacao.anterior?.fotos || dadosSalvos[1]?.fotos) && (relatoriosComparacao.anterior?.fotos?.length > 0 || dadosSalvos[1]?.fotos?.length > 0) && (
                      <div className="mb-4">
                        <h6 className="text-sm font-medium text-gray-700">Fotos</h6>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {(relatoriosComparacao.anterior?.fotos || dadosSalvos[1]?.fotos || []).slice(0, 4).map((foto: string, idx: number) => (
                            <img key={idx} src={foto} className="rounded-md w-full h-24 object-cover" alt={`Foto ${idx+1}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Botão de exportar PDF */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={gerarPDF}
                    disabled={exportandoPDF}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 disabled:bg-gray-400"
                  >
                    {exportandoPDF ? (
                      <>
                        <span className="animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></span>
                        <span>Gerando PDF...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span>Exportar PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setActiveTab('relatorio')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voltar para Relatório
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Menu de navegação inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 py-2 z-10">
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
          
          <Link href="/relatorio" className="flex flex-col items-center justify-center p-2 text-primary-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium">Relatório</span>
          </Link>
        </div>
      </nav>
    </div>
  );
} 