import Hero from "@/components/Hero";
export default function Home() {
  return (
    <div className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center z-10 pointer-events-none">
      <div className="w-full flex items-center justify-center pointer-events-auto">
        <Hero />
      </div>
    </div>
  );
}

