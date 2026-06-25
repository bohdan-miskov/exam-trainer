import type { APIRoute } from "astro";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { attemptQuestions } from "../../db/schema";

export const GET: APIRoute = async ({ url }) => {
  try {
    const attemptIdStr = url.searchParams.get("id");
    if (!attemptIdStr) {
      return new Response(JSON.stringify({ error: "Missing attempt ID" }), { status: 400 });
    }

    const attemptId = parseInt(attemptIdStr, 10);
    if (isNaN(attemptId)) {
      return new Response(JSON.stringify({ error: "Invalid attempt ID" }), { status: 400 });
    }

    const sql = neon(import.meta.env.DATABASE_URL);
    const db = drizzle(sql);

    const rows = await db
      .select({
        id: attemptQuestions.id,
        questionId: attemptQuestions.questionId,
        userChoices: attemptQuestions.userChoices,
        isCorrect: attemptQuestions.isCorrect,
      })
      .from(attemptQuestions)
      .where(eq(attemptQuestions.attemptId, attemptId));

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (err) {
    console.error("Failed to fetch attempt details:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch attempt details" }), { status: 500 });
  }
};
