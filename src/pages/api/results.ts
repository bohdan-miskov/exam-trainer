import type { APIRoute } from "astro";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import { attempts, wrongAnswers } from "../../db/schema";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  // Підключення до БД (рядок підключення береться з .env)
  const sql = neon(import.meta.env.DATABASE_URL);
  const db = drizzle(sql);

  const percentage = (body.correct / body.total) * 100;

  // Записуємо спробу
  await db.insert(attempts).values({
    correct: body.correct,
    total: body.total,
    percentage: percentage,
  });

  // Записуємо нові неправильні відповіді (запобігаємо дублікатам)
  if (body.newWrongIds && body.newWrongIds.length > 0) {
    const existingWrong = await db
      .select({ questionId: wrongAnswers.questionId })
      .from(wrongAnswers)
      .where(inArray(wrongAnswers.questionId, body.newWrongIds));
    
    const existingSet = new Set(existingWrong.map((r) => r.questionId));
    const toInsert = body.newWrongIds
      .filter((id: number) => !existingSet.has(id))
      .map((id: number) => ({ questionId: id }));

    if (toInsert.length > 0) {
      await db.insert(wrongAnswers).values(toInsert);
    }
  }

  // Видаляємо виправлені відповіді, які користувач тепер відповів правильно
  if (body.clearedIds && body.clearedIds.length > 0) {
    await db
      .delete(wrongAnswers)
      .where(inArray(wrongAnswers.questionId, body.clearedIds));
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
