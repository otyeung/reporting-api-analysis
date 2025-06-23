import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from './components/AuthProvider'
import Navigation from './components/Navigation'

export const metadata: Metadata = {
  title: 'Reporting API Analysis',
  description:
    'Compare LinkedIn Analytics API strategies for campaign reporting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
