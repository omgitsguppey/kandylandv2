"use client";

import Hero from "@/components/Hero";
import { useDrops } from "@/hooks/useDrops";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { drops, loading } = useDrops();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand-pink animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-11rem)] md:h-[calc(100vh-5rem)] w-full overflow-hidden flex flex-col items-center justify-center">

      {/* Hero Section - Full Height */}
      <div className="flex-1 flex items-center justify-center w-full">
        <Hero />
      </div>

    </div>
  );
}

