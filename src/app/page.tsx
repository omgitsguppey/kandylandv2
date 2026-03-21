"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const isAdmin = userProfile?.role === "admin";
  const isExplicitAdminPublicHome = searchParams.get("publicHome") === "1";
  // We strictly wait until we know they aren't an admin. If userProfile is null, we assume they MIGHT be an admin and show the spinner momentarily, unless we explicitly know they are a standard user.
  const shouldRedirectSignedInUser =
    !isExplicitAdminPublicHome &&
    !loading &&
    !!user &&
    (userProfile ? !isAdmin : true);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      trackEvent("home_page_viewed");
    }
  }, [loading, user]);

  useEffect(() => {
    if (!loading && user && userProfile && !isAdmin) {
      router.replace(readPreferredAuthenticatedPath(userProfile.role));
    }
  }, [loading, router, user, userProfile, isAdmin]);

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
      <Hero activeDrops={activeDrops} />
      <HowItWorks activeDrops={activeDrops} />

      <footer className="border-t border-white/10 px-4 py-12 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} KandyDrops. All rights reserved.</p>
      </footer>
    </div>
  );
}
