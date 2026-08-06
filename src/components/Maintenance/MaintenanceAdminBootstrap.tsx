"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";

type AccessState = "checking" | "signed-out" | "not-admin" | "unavailable";

const stateCopy: Record<AccessState, { title: string; message: string }> = {
  checking: {
    title: "Checking administrator access",
    message: "Please wait a moment.",
  },
  "signed-out": {
    title: "Administrator sign-in is required",
    message: "Administrator sign-in is required in this browser.",
  },
  "not-admin": {
    title: "Administrator access is unavailable",
    message: "This account does not have administrator access.",
  },
  unavailable: {
    title: "Administrator access is unavailable",
    message: "Admin access is temporarily unavailable. Try again shortly.",
  },
};

export function MaintenanceAdminBootstrap() {
  const router = useRouter();
  const sessionRequestStarted = useRef(false);
  const [accessState, setAccessState] = useState<AccessState>("checking");

  useEffect(() => {
    let isActive = true;
    const authInstance = auth;

    if (!authInstance) {
      setAccessState("unavailable");
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (!isActive) {
        return;
      }

      if (!user) {
        setAccessState("signed-out");
        return;
      }

      if (sessionRequestStarted.current) {
        return;
      }

      sessionRequestStarted.current = true;
      setAccessState("checking");

      try {
        const response = await authFetch("/api/auth/navigation-session", {
          method: "POST",
        });

        if (!isActive) {
          return;
        }

        if (response.status === 401) {
          setAccessState("signed-out");
          return;
        }

        if (response.status === 403) {
          setAccessState("not-admin");
          return;
        }

        if (!response.ok) {
          setAccessState("unavailable");
          return;
        }

        router.replace("/admin");
      } catch {
        if (isActive) {
          setAccessState("unavailable");
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [router]);

  const copy = stateCopy[accessState];

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-[#12051f] px-5 py-8 text-white">
      <div aria-hidden="true" className="absolute -left-24 top-[-10rem] h-80 w-80 rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl" />
      <section aria-live="polite" className="relative w-full max-w-md rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-100 via-fuchsia-400 to-pink-400 text-3xl font-black text-fuchsia-950 shadow-lg">
          K
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-fuchsia-100">KandyDrops maintenance</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-white">{copy.title}</h1>
        <p className="mt-4 text-base leading-7 text-fuchsia-50/90">{copy.message}</p>
      </section>
    </main>
  );
}
