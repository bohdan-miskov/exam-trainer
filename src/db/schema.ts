import { pgTable, serial, integer, real, timestamp } from "drizzle-orm/pg-core";

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
