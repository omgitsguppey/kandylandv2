import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";

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

import { PayPalProvider } from "@/components/PayPalProvider";
import { UIProvider } from "@/context/UIContext";
import MobileBottomBar from "@/components/Navigation/MobileBottomBar";
import { GlobalPurchaseModal } from "@/components/GlobalPurchaseModal"; // Import from new file
import { OnboardingModal } from "@/components/Auth/OnboardingModal";
import { Toaster } from 'sonner';
import CookieBanner from "@/components/CookieBanner";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-black text-white selection:bg-brand-pink selection:text-white">
        <AuthProvider>
          <UIProvider>
            <PayPalProvider>
              <PerformanceMonitor />
              <main className="pt-20 min-h-screen relative overflow-hidden pb-24 md:pb-0">
                {/* Background Elements */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-pink/20 blur-[120px] animate-float" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-cyan/20 blur-[120px] animate-float animation-delay-2000" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <Navbar />
                  {children}
                </div>

                <MobileBottomBar />
                <GlobalPurchaseModal />
                <OnboardingModal />
                <Toaster position="top-center" theme="dark" richColors closeButton />
              </main>
            </PayPalProvider>
            <CookieBanner />
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
