import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { Locale, routing } from "@/i18n/routing"
import { auth } from '@/auth'
import "./globals.css"

import ThemeProvider from "@/providers/theme-provider"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RestFlow — Smart Workout Recovery",
  description: "RestFlow uses an advanced dynamic algorithm to optimize your rest between sets.",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function AppLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as Locale)) {
    notFound()
  }
  
  const messages = await getMessages()
  const session = await auth()

  // console.log({locale, messages})
  
  return (
    <html suppressHydrationWarning lang={locale}>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground antialiased overflow-x-hidden`}>
        <SessionProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <Navbar />
              <main className="flex-1 flex flex-col w-full">
                {children}
              </main>
              <Footer />
              <Toaster />
            </NextIntlClientProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
