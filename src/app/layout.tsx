import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Oyster Map NYC',
  description: 'Best oyster happy hours in NYC from The Infatuation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
