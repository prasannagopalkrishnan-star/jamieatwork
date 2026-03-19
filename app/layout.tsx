import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Jamie at Work — AI Digital Employees Marketplace',
  description: 'Hire AI digital employees that integrate into your organization. Benefits specialists, compliance officers, and more — powered by AI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
