import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Treino | App Treino',
  description: 'Visualize e gerencie seu treino'
};

export default function TreinoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 