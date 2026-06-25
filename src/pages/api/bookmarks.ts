import type { APIRoute } from "astro";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { bookmarks } from "../../db/schema";

// GET: Отримати список всіх ID закладок
export const GET: APIRoute = async () => {
  try {
    const sql = neon(import.meta.env.DATABASE_URL);
    const db = drizzle(sql);

    const rows = await db
      .select({ questionId: bookmarks.questionId })
      .from(bookmarks);

    const ids = [...new Set(rows.map((r) => r.questionId))];

    return new Response(JSON.stringify(ids), { status: 200 });
  } catch (err) {
    console.error("Failed to fetch bookmarks:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch bookmarks" }), { status: 500 });
  }
};

// POST: Додати або видалити закладку (toggle)
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const qid = body.questionId;

    if (typeof qid !== "number") {
      return new Response(JSON.stringify({ error: "Invalid questionId" }), { status: 400 });
    }

    const sql = neon(import.meta.env.DATABASE_URL);
    const db = drizzle(sql);

    // Перевіряємо чи закладка вже існує
    const existing = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.questionId, qid));

    if (existing.length > 0) {
      // Якщо існує — видаляємо
      await db.delete(bookmarks).where(eq(bookmarks.questionId, qid));
      return new Response(JSON.stringify({ bookmarked: false }), { status: 200 });
    } else {
      // Якщо немає — створюємо
      await db.insert(bookmarks).values({ questionId: qid });
      return new Response(JSON.stringify({ bookmarked: true }), { status: 200 });
    }
  } catch (err) {
    console.error("Failed to toggle bookmark:", err);
    return new Response(JSON.stringify({ error: "Failed to toggle bookmark" }), { status: 500 });
  }
};
