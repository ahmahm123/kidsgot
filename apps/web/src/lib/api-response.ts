import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 201, ...init });
}

export function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function tooManyRequests(message: string, resetAt: Date) {
  return NextResponse.json(
    { error: message, resetAt: resetAt.toISOString() },
    {
      status: 429,
      headers: {
        "x-ratelimit-reset": String(Math.floor(resetAt.getTime() / 1000))
      }
    }
  );
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
