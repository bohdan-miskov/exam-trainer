import { pgTable, serial, integer, real, timestamp, text, boolean } from "drizzle-orm/pg-core";

export const attempts = pgTable("attempts", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  correct: integer("correct").notNull(),
  total: integer("total").notNull(),
  percentage: real("percentage").notNull(),
});

export const wrongAnswers = pgTable("wrong_answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const attemptQuestions = pgTable("attempt_questions", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").references(() => attempts.id, { onDelete: "cascade" }).notNull(),
  questionId: integer("question_id").notNull(),
  userChoices: text("user_choices").notNull(), // e.g. "0,1" or "2" or ""
  isCorrect: boolean("is_correct").notNull(),
});
