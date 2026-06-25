import type { APIRoute } from "astro";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { gte, lte, and, asc } from "drizzle-orm";
import { attempts } from "../../db/schema";

export const GET: APIRoute = async ({ url }) => {
  const weekOption = parseInt(url.searchParams.get("week") || "1", 10);
  const sql = neon(import.meta.env.DATABASE_URL);
  const db = drizzle(sql);

  const today = new Date();
  const endDate = new Date(today.setHours(23, 59, 59, 999));

  // Обчислення початкової дати залежно від обраного тижня (аналог week_range)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7 * (weekOption - 1) - 7 + 1);
  startDate.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(attempts)
    .where(
      and(gte(attempts.timestamp, startDate), lte(attempts.timestamp, endDate)),
    )
    .orderBy(asc(attempts.timestamp));

  const totalCorrect = rows.reduce((sum, r) => sum + r.correct, 0);
  const totalTotal = rows.reduce((sum, r) => sum + r.total, 0);
  const overallPct = totalTotal > 0 ? (totalCorrect / totalTotal) * 100 : 0;

  return new Response(
    JSON.stringify({
      rows,
      totalCorrect,
      totalTotal,
      overallPct: overallPct.toFixed(2),
      period: `${startDate.toLocaleDateString("en-US")} – ${endDate.toLocaleDateString("en-US")}`,
    }),
    { status: 200 },
  );
};
