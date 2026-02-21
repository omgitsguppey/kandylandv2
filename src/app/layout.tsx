import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { UIProvider } from "@/context/UIContext";
import { NowProvider } from "@/context/NowContext";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CoreLayoutWrapper } from "@/components/CoreLayoutWrapper";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KandyDrops | Exclusive Digital Content",
  description: "Get Gum Drops, Unlock Content, Feel the Rush.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-[100dvh] bg-black text-white selection:bg-brand-pink selection:text-white flex flex-col overflow-x-hidden">
        <AuthProvider>
          <UIProvider>
            <NowProvider>
              <CoreLayoutWrapper>
                <main className="pt-24 pb-32 md:pb-0 flex-1 relative flex flex-col">

                  {/* Background Elements */}
                  <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-brand-pink/15 blur-[150px] animate-float transform-gpu" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-cyan/20 blur-[120px] animate-float animation-delay-2000 transform-gpu" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex-1 w-full">
                    <Navbar />
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  </div>
                </main>
                <Analytics />
                <SpeedInsights />
              </CoreLayoutWrapper>
            </NowProvider>
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
