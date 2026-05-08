import { NextResponse } from "next/server";
import type { FourXxClass } from "@/lib/server/http-error-cost-contract";

type Cheap4xxInput = {
  status: 400 | 401 | 403 | 404 | 405 | 410 | 413 | 415 | 429;
  code: string;
  message: string;
  class: FourXxClass;
  cacheTtlSeconds?: number;
  contentType?: "json" | "text";
};

export function cheap4xxResponse(input: Cheap4xxInput) {
  const headers = new Headers();
  headers.set("x-kd-4xx-class", input.class);
  headers.set("x-kd-4xx-code", input.code);
  headers.set("x-kd-cheap-reject", "true");

  if (typeof input.cacheTtlSeconds === "number" && input.cacheTtlSeconds > 0) {
    headers.set("cache-control", `public, max-age=${Math.floor(input.cacheTtlSeconds)}, stale-while-revalidate=60`);
  } else {
    headers.set("cache-control", "no-store");
  }

  if (input.contentType === "text") {
    headers.set("content-type", "text/plain; charset=utf-8");
    return new NextResponse(`${input.status} ${input.code}`, {
      status: input.status,
      headers,
    });
  }

  const body = {
    success: false,
    code: input.code,
    message: input.message,
  } as const;

  return NextResponse.json(body, {
    status: input.status,
    headers,
  });
}
