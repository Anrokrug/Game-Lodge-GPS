import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const _playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const _inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Property Navigator',
  description: 'GPS-guided navigation to every home on your estate.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${_playfair.variable} ${_inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
