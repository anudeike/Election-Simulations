import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opinion Dynamics & District Elections Simulator',
  description: 'Interactive 2D grid simulation of opinion dynamics and district-based elections',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
