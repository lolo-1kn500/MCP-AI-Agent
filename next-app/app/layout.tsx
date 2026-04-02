import "./globals.css"
import type { ReactNode } from "react"

export const metadata = {
  title: "Kai.AI Agent SaaS",
  description: "Multi-agent SaaS with x402 paywall, Supabase auth, vector memory"
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
