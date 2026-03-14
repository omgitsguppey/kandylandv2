"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Hero from "@/components/Hero";
import { HowItWorks } from "@/components/Landing/HowItWorks";
import { LivePreviews } from "@/components/Landing/LivePreviews";
import { useAuth } from "@/context/AuthContext";
import { trackEvent } from "@/lib/telemetry";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const shouldRedirectSignedInUser = !loading && user && userProfile?.role !== "admin";

  useEffect(() => {
    trackEvent("home_page_viewed");
  }, []);

  useEffect(() => {
    if (!loading && user && userProfile?.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, router, user, userProfile]);

  if (shouldRedirectSignedInUser) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
      </div>
    );
  }

    return (
    <div
      className="min-h-screen overflow-y-auto bg-black pb-[calc(7.75rem+env(safe-area-inset-bottom))] md:pb-0"
      style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
    >
      <Hero />
      <HowItWorks />
      <LivePreviews />

      <footer className="border-t border-white/10 px-4 py-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
      </footer>
    </div>
  );
}
