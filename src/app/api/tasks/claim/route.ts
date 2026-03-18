import { NextResponse } from "next/server";

// Legacy route retained for compatibility with older generated route metadata and stale clients.
export async function POST() {
  return NextResponse.json(
    {
      error: "Task claiming has been retired. Daily task rewards are granted automatically when progress completes.",
      deprecated: true,
    },
    { status: 410 },
  );
}
