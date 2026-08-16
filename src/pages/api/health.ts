import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";

export const prerender = false;

// Opens the database and actually queries it. A 200 from the homepage
// only proves the static tree is being served; this proves the process
// is up and its state directory is reachable.
export const GET: APIRoute = () => {
  getDb().prepare("SELECT 1 FROM sqlite_schema LIMIT 1").get();
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
