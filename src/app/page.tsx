import Hero from "@/components/Hero";
export default function Home() {
  return (
    <div className="min-h-[calc(100dvh-5rem)] w-full flex flex-col items-center justify-center px-4 sm:px-6">

      {/* Hero Section - Full Height */}
      <div className="flex-1 flex items-center justify-center w-full">
        <Hero />
      </div>

    </div>
  );
}

