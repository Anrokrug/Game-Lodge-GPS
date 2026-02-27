import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Property Navigator',
  description: 'GPS-guided navigation to every home on your estate.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body className={`${inter.className} antialiased`} style={{ backgroundColor: '#f7f5f0', color: '#1a2a1e' }}>
        {children}
      </body>
    </html>
  )
}
