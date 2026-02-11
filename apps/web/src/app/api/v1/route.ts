import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "humanrent-api",
    version: "1.0.0"
  });
}
