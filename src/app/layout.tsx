import type { Metadata } from 'next'
import './globals.css'
import { DataProvider } from '@/context/DataContext'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'Vale Analytics',
  description: 'Plataforma de análise e visualização de dados Vale',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
        <DataProvider>
          <AppShell>{children}</AppShell>
        </DataProvider>
      </body>
    </html>
  )
}
