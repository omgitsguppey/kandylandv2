"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { authFetch } from "@/lib/authFetch";
import { auth } from "@/lib/firebase";
import { readUiJson } from "@/lib/ui-continuity";
import { resolveMaintenanceAdminReturnPath } from "../../../shared/runtime/maintenance-mode-contract";

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
  const sessionRequest = useRef<{ uid: string | null; result: Promise<AccessState | "authorized"> } | null>(null);
  const [accessState, setAccessState] = useState<AccessState>("checking");

  useEffect(() => {
    let isActive = true;
    let observedUid: string | null | undefined;
    const authInstance = auth;

    if (!authInstance) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep the server and first client render in the checking state, then show missing Firebase availability after mount.
      setAccessState("unavailable");
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (!isActive) {
        return;
      }

      const uid = user?.uid ?? null;
      if (observedUid === uid) return;
      observedUid = uid;

      if (!user) {
        // Keep the pending request barrier so a later account cannot race its cookie response.
        if (sessionRequest.current) sessionRequest.current = { ...sessionRequest.current, uid: null };
        setAccessState("signed-out");
        return;
      }
      setAccessState("checking");

      if (sessionRequest.current?.uid !== user.uid) {
        const previous = sessionRequest.current;
        const requestAccess = async (): Promise<AccessState | "authorized"> => {
          if (authInstance.currentUser?.uid !== user.uid) return "unavailable";
          try {
            const response = await authFetch("/api/auth/navigation-session", { method: "POST" });
            if (response.status === 401) return "signed-out";
            if (response.status === 403) return "not-admin";
            const result = await readUiJson<{ success: true; role: string }>(response, {
              moduleLabel: "Administrator access", url: "/api/auth/navigation-session", requireSuccess: true,
            });
            return result.role === "admin" ? "authorized" : "unavailable";
          } catch {
            return "unavailable";
          }
        };
        // Reuse the parsed result during effect replay; serialize real actor changes.
        sessionRequest.current = {
          uid: user.uid,
          result: previous ? previous.result.then(requestAccess) : requestAccess(),
        };
      }
      const request = sessionRequest.current;
      const result = await request.result;
      if (!isActive || sessionRequest.current !== request || authInstance.currentUser?.uid !== user.uid) return;
      if (result === "authorized") {
        const destination = new URLSearchParams(window.location.search).get("next");
        router.replace(resolveMaintenanceAdminReturnPath(destination));
      } else {
        setAccessState(result);
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
