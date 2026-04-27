import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Health endpoint consumed by the deploy script before flipping the
// `current` symlink. A 200 here means: the bundle started, server.js
// is serving, the SQLite file at SQLITE_PATH is readable, and the
// schema parses. Anything weaker (e.g. just rendering / over HTTP) lets
// schema or route-handler regressions ship green.
export const dynamic = "force-dynamic";

export function GET() {
  try {
    const db = getDb();
    db.prepare("SELECT 1 FROM sqlite_schema LIMIT 1").get();
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json(
      { status: "unhealthy", error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
