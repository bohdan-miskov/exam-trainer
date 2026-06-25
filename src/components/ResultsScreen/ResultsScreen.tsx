import React from "react";
import type { Question } from "../../utils/parser";
import styles from "./ResultsScreen.module.css";

interface ResultsScreenProps {
  score: number;
  total: number;
  quizMode: string;
  newWrongIds: number[];
  clearedIds: number[];
  currentQuestions: Question[];
  userAnswers: { [questionId: number]: Set<number> };
  onReturnMenu: () => void;
}

export default function ResultsScreen({
  score,
  total,
  quizMode,
  newWrongIds,
  clearedIds,
  currentQuestions,
  userAnswers,
  onReturnMenu,
}: ResultsScreenProps) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPass = percentage >= 80;

  return (
    <div>
      <div className={styles.resultsHeader}>
        <h2 className={styles.titleGradient}>Quiz Completed!</h2>
        <p className={styles.textMuted}>Review your session summary below</p>
      </div>

      <div className={styles.resultsSummary}>
        <div className={styles.circularProgressWrapper}>
          <svg width="120" height="120" viewBox="0 0 120 120" className={styles.circularProgressSvg}>
            <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle 
              cx="60" 
              cy="60" 
              r="50" 
              fill="transparent" 
              stroke="url(#indigoPurpleGrad)" 
              strokeWidth="8" 
              strokeDasharray={314.16} 
              strokeDashoffset={314.16 - (314.16 * (total > 0 ? score / total : 0))}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
            <defs>
              <linearGradient id="indigoPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.circularProgressValue}>
            {percentage}%
          </div>
        </div>

        <div className={styles.textCenter}>
          <div className={styles.resultsScoreText}>
            {score} / {total} Correct
          </div>
          <p className={`${styles.resultsFeedback} ${isPass ? styles.textCorrect : ""}`}>
            {total > 0 && score / total === 1 ? (
              "Perfect Score! 🌟 Ready for the exam!"
            ) : isPass ? (
              "Passing Score! 🎉 Excellent progress."
            ) : total > 0 && score / total >= 0.6 ? (
              "Passed, but requires review. 👍 Practice more."
            ) : (
              "Did not pass. 📚 Review incorrect answers."
            )}
          </p>
        </div>
      </div>

      <div className={`${styles.statsGrid} ${styles.mb7}`}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Mode</div>
          <div className={`${styles.statVal} ${styles.statValSm} ${styles.textCapitalize}`}>
            {quizMode}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Mistakes Added</div>
          <div className={`${styles.statVal} ${styles.statValSm} ${newWrongIds.length > 0 ? styles.textIncorrect : ""}`}>
            {newWrongIds.length}
          </div>
        </div>
        {quizMode === "wrong" && (
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Questions Cleared</div>
            <div className={`${styles.statVal} ${styles.statValSm} ${clearedIds.length > 0 ? styles.textCorrect : ""}`}>
              {clearedIds.length}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Question Review List */}
      {currentQuestions.length > 0 && Object.keys(userAnswers).length > 0 && (
        <div className={styles.reviewHeader}>
          <h3 className={styles.statsHistoryTitle}>Detailed Session Review</h3>
          <div className={styles.reviewList}>
            {currentQuestions.map((q, qIndex) => {
              const answers = userAnswers[q.id] || new Set();
              const correctIndices = new Set(
                q.options.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1)
              );
              const isCorrect =
                answers.size === correctIndices.size &&
                [...answers].every((v) => correctIndices.has(v));

              return (
                <div
                  key={q.id}
                  className={`${styles.reviewItem} ${
                    isCorrect ? styles.correctReview : styles.incorrectReview
                  }`}
                >
                  <div className={styles.reviewQuestion}>
                    {qIndex + 1}. {q.text}
                  </div>
                  
                  <div className={styles.reviewAnswerLabel}>Your Choice:</div>
                  <div className={styles.reviewAnswers}>
                    {answers.size > 0 ? (
                      [...answers]
                        .map((idx) => `${String.fromCharCode(65 + idx)}. ${q.options[idx].text}`)
                        .join(", ")
                    ) : (
                      <span className={styles.textIncorrect}>No answer selected</span>
                    )}
                  </div>

                  {!isCorrect && (
                    <>
                      <div className={`${styles.reviewAnswerLabel} ${styles.mt1}`}>Correct Choice:</div>
                      <div className={styles.reviewAnswers} style={{ color: "var(--correct-text)" }}>
                        {[...correctIndices]
                          .map((idx) => `${String.fromCharCode(65 + idx)}. ${q.options[idx].text}`)
                          .join(", ")}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onReturnMenu}
        className={`${styles.btn} ${styles.wFull} ${styles.mt1}`}
        style={{ marginTop: "24px" }}
      >
        Return to Main Menu
      </button>
    </div>
  );
}
