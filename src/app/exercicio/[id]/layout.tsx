import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exercício | App Treino',
  description: 'Registre suas séries'
};

export default function ExercicioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 