"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Hero from "@/components/Hero";
import { HowItWorks } from "@/components/Landing/HowItWorks";
import { useAuth } from "@/context/AuthContext";
import { useDrops } from "@/hooks/useDrops";
import { readPreferredAuthenticatedPath } from "@/lib/navigation-persistence";
import { trackEvent } from "@/lib/telemetry";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const { drops: activeDrops } = useDrops(["active"]);
  const router = useRouter();
  const isAdmin = userProfile?.role === "admin";
  const shouldRedirectSignedInUser =
    !loading &&
    !!user &&
    !!userProfile &&
    !isAdmin;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && (!user || isAdmin)) {
      trackEvent("home_page_viewed");
    }
  }, [isAdmin, loading, user]);

  useEffect(() => {
    if (!loading && user && userProfile && !isAdmin) {
      router.replace(readPreferredAuthenticatedPath(userProfile.role));
    }
  }, [loading, router, user, userProfile, isAdmin]);

  return (
    <div
      className="relative min-h-screen overflow-y-auto bg-black pb-[calc(7.75rem+env(safe-area-inset-bottom))] md:pb-0"
      style={{ paddingTop: "var(--kandy-cookie-offset, 0px)" }}
    >
      {shouldRedirectSignedInUser ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-black/30">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
            Returning you to your dashboard
          </div>
        </div>
      ) : null}
      <Hero activeDrops={activeDrops} />
      <HowItWorks activeDrops={activeDrops} />

      <footer className="border-t border-white/10 px-4 py-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
      </footer>
    </div>
  );
}
