import { NextRequest, NextResponse } from "next/server";

// MVP lead capture for the /episodes signup wall. There is no database or
// email service wired into this project yet, so a submitted lead is only
// durably recorded in Vercel's function logs (Project -> Logs) — it is NOT
// stored anywhere queryable. Wire this up to a real store (Vercel Postgres/
// KV, or a transactional email webhook) before relying on it to actually
// capture leads long-term.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = typeof body === "object" && body !== null ? (body as Record<string, unknown>).email : undefined;
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  console.log(`[signup] new demo lead: ${email} at ${new Date().toISOString()}`);

  return NextResponse.json({ ok: true });
}
