"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CandyIcon } from "@/components/ui/Icon";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-brand-pink/20 blur-3xl rounded-full"></div>
                <CandyIcon size="xl" className="opacity-50 grayscale" />
            </div>

            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 mb-4">404</h1>
            <h2 className="text-2xl font-bold text-white mb-6">Page Not Found</h2>
            <p className="text-gray-400 max-w-md mb-8">
                Looks like this drop has melted away. The page you are looking for does not exist.
            </p>

            <Link href="/">
                <Button variant="brand" size="lg" className="rounded-full px-8">
                    Return Home
                </Button>
            </Link>
        </div>
    );
}
