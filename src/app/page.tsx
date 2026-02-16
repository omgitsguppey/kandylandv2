import Hero from "@/components/Hero";
export default function Home() {
  return (
    <div className="h-[calc(100dvh-11rem)] md:h-[calc(100dvh-5rem)] w-full overflow-hidden flex flex-col items-center justify-center">

      {/* Hero Section - Full Height */}
      <div className="flex-1 flex items-center justify-center w-full">
        <Hero />
      </div>

    </div>
  );
}

