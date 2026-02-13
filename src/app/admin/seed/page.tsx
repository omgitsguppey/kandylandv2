"use client";

import { useState } from "react";
import { collection, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const SAMPLE_TITLES = [
    "Neon Lollipops Pack", "Cyber Gummy Bears", "Retro Wave Soda", "Glitch Pop Rocks",
    "Synthwave Sour Belts", "Pixelated Peaches", "Quantum Jawbreakers", "Holographic Taffy",
    "Digital Donut Hole", "Vaporwave Vanilla", "Bitcrushed Bubblegum", "Laser Lemon Drops",
    "Plasma Peppermint", "Electric Espresso", "Binary Blueberry", "Circuit Cherry",
    "Mainframe Marshmallow", "Techno Toffee", "Android Apple", "Encryption Eclairs"
];

const DESCRIPTIONS = [
    "A sweet collection of glowing sugary goodness. Limited time only!",
    "Unlock the flavor of the future with this exclusive drop.",
    "Retro vibes meet modern taste. Don't miss out!",
    "Glitch in the matrix? No, just an explosion of flavor.",
    "High voltage sweetness for the digital age."
];

export default function AdminSeedPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const createTestDrops = async () => {
        if (!user || user.email !== "uylusjohnson@gmail.com") {
            setMessage("Unauthorized: You must be uylusjohnson@gmail.com");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const batch = writeBatch(db);
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            // Generate 20 drops
            for (let i = 0; i < 20; i++) {
                const newDocRef = doc(collection(db, "drops"));

                // Randomize dates to have some active, some expired, some future
                let validFrom, validUntil;
                const rand = Math.random();

                if (rand < 0.2) {
                    // Expired (20%)
                    validFrom = now - (oneDay * 5);
                    validUntil = now - (oneDay * 1);
                } else if (rand < 0.8) {
                    // Active (60%)
                    validFrom = now - (oneDay * 1);
                    validUntil = now + (oneDay * 2);
                } else {
                    // Scheduled (20%)
                    validFrom = now + (oneDay * 1);
                    validUntil = now + (oneDay * 5);
                }

                const newDrop: Drop = {
                    id: newDocRef.id,
                    title: SAMPLE_TITLES[i % SAMPLE_TITLES.length] + ` #${Math.floor(Math.random() * 100)}`,
                    description: DESCRIPTIONS[i % DESCRIPTIONS.length],
                    imageUrl: `https://picsum.photos/seed/${i}/400/400`, // Random placeholder image
                    contentUrl: "https://example.com/secret-content",
                    unlockCost: Math.floor(Math.random() * 10) * 10 + 10, // 10, 20, ... 100
                    validFrom,
                    validUntil,
                    status: (now < validUntil) ? ((now < validFrom) ? "scheduled" : "active") : "expired",
                    totalUnlocks: Math.floor(Math.random() * 50),
                };

                batch.set(newDocRef, newDrop);
            }

            await batch.commit();
            setMessage("✅ Successfully seeded 20 drops!");
        } catch (err: any) {
            console.error(err);
            setMessage(`Error seeding drops: ${err.message || err.toString()}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-24 px-8 flex items-center justify-center">
            <div className="max-w-md w-full glass-panel p-8 rounded-2xl text-center">
                <h1 className="text-3xl font-bold mb-4 text-white">Seed Database</h1>
                <p className="text-gray-400 mb-8">
                    Generate 20 mock KandyDrops with varied statuses (Active, Expired, Scheduled) for testing.
                </p>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 text-sm text-yellow-200">
                    Warning: This will add 20 new documents to your Firestore 'drops' collection.
                </div>

                <button
                    onClick={createTestDrops}
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple font-bold text-white shadow-lg shadow-brand-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Seeding...
                        </>
                    ) : (
                        "Generate 20 Drops"
                    )}
                </button>

                {message && (
                    <div className={`mt-6 p-4 rounded-xl text-sm font-bold ${message.includes("Error") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
