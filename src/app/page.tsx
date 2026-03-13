"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Hero from "@/components/Hero";
import { useAuth } from "@/context/AuthContext";
import { HowItWorks } from "@/components/Landing/HowItWorks";
import { LivePreviews } from "@/components/Landing/LivePreviews";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (userProfile?.role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [loading, router, user, userProfile]);

  if (loading || (user && userProfile?.role !== "admin")) {
    return (
      <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center z-10">
        <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-black overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <Hero />
      <HowItWorks />
      <LivePreviews />

      {/* Simple Footer */}
      <footer className="border-t border-white/10 py-12 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
      </footer>
    </div>
  );
}
