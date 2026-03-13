import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Task claiming has been retired. Daily task rewards are now granted automatically when progress completes.",
      deprecated: true,
    },
    { status: 410 },
  );
}
