"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function DailyTaskSkeleton() {
  return (
    <div className="grid gap-2.5">
      {[1, 2, 3].map((idx) => (
        <article
          key={idx}
          className="overflow-hidden rounded-[1.6rem] border border-white/5 bg-black/20 p-3.5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/5 bg-white/5 text-gray-600">
              <Bell className="h-5 w-5 opacity-50" />
            </div>
            <div className="min-w-0 flex-1 py-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 animate-pulse rounded-md bg-white/10" />
              </div>
              <div className="mt-3.5 h-1.5 w-full animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
