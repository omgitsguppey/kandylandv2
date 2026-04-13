import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { RolloutProvider } from "@/context/RolloutContext";
import { SWRProvider } from "@/context/SWRProvider";
import { UIProvider } from "@/context/UIContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CoreLayoutWrapper } from "@/components/CoreLayoutWrapper";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_ORIGIN } from "@/lib/site-origin";
import { UIDebug } from "@/components/UIDebug";
import { CSPostHogProvider } from "@/components/Analytics/CSPostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteTitle = "KandyDrops";
const siteDescription = "Get Gum Drops, unlock exclusive digital content, and stay ready for the next live drop.";
const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_MEASUREMENT_ID ||
  "G-V8PWC2L31H";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${siteTitle} | Exclusive Digital Content`,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  applicationName: siteTitle,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_ORIGIN,
    siteName: siteTitle,
    title: `${siteTitle} | Exclusive Digital Content`,
    description: siteDescription,
    images: [
      {
        url: "/candy-main.svg",
        width: 512,
        height: 512,
        alt: "KandyDrops",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteTitle} | Exclusive Digital Content`,
    description: siteDescription,
    images: ["/candy-main.svg"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteTitle,
  },
  icons: {
    icon: "/candy-main.svg",
    apple: "/candy-main.svg",
  },
};


export const viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-[100dvh] app-bg text-white selection:bg-brand-purple selection:text-white flex flex-col">
        <UIDebug />
        <CSPostHogProvider>
          <AuthProvider>
            <RolloutProvider>
              <SWRProvider>
                <UIProvider>
                  <CoreLayoutWrapper>
                    <main className="pt-24 pb-32 md:pb-0 flex-1 relative flex flex-col overflow-x-hidden">

                      {/* Content */}
                      <div className="relative z-10 flex-1 w-full">
                        <ErrorBoundary>
                          {children}
                        </ErrorBoundary>
                      </div>
                    </main>
                  </CoreLayoutWrapper>
                </UIProvider>
              </SWRProvider>
            </RolloutProvider>
          </AuthProvider>
        </CSPostHogProvider>
      </body>
      <GoogleAnalytics gaId={googleAnalyticsId} />
    </html>
  );
}
