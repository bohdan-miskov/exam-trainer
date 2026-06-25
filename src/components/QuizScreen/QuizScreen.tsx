import React from "react";
import type { Question } from "../../utils/parser";
import styles from "./QuizScreen.module.css";

interface QuizScreenProps {
  quizTitle: string;
  currentQuestion: Question;
  currentIndex: number;
  totalQuestions: number;
  selectedOptions: Set<number>;
  hasAnswered: boolean;
  isCurrentCorrect: boolean;
  timer: number | null;
  formatSeconds: (seconds: number) => string;
  onOptionToggle: (idx: number, isMultiple: boolean) => void;
  onCheckAnswer: () => void;
  onNext: () => void;
  onEndQuiz: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export default function QuizScreen({
  quizTitle,
  currentQuestion,
  currentIndex,
  totalQuestions,
  selectedOptions,
  hasAnswered,
  isCurrentCorrect,
  timer,
  formatSeconds,
  onOptionToggle,
  onCheckAnswer,
  onNext,
  onEndQuiz,
  isBookmarked,
  onToggleBookmark,
}: QuizScreenProps) {
  const correctCount = currentQuestion.options.filter((o) => o.isCorrect).length;
  const isMultipleChoice = correctCount > 1;

  return (
    <div>
      <div className={styles.quizHeader}>
        <span className={`${styles.quizBadge} ${styles.textCapitalize}`} style={{ background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.25)", color: "#c7d2fe" }}>
          {quizTitle}
        </span>

        {/* Toggle Bookmark Button */}
        <button 
          onClick={onToggleBookmark} 
          className={`${styles.bookmarkBtn} ${isBookmarked ? styles.isBookmarked : ""}`}
          aria-label="Toggle Bookmark"
        >
          {isBookmarked ? "★ Starred" : "☆ Star"}
        </button>

        {/* Countdown Timer for Exam Mode */}
        {timer !== null && (
          <span className={`${styles.timerContainer} ${timer < 300 ? styles.timerWarning : ""}`}>
            ⏱ {formatSeconds(timer)}
          </span>
        )}

        <span className={styles.quizBadge}>
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <p className={styles.questionText}>
        {currentQuestion.text}
      </p>

      {/* Selection Hint (helps user select correct amount of options) */}
      <div className={styles.selectionHint}>
        {isMultipleChoice ? (
          <span className={styles.textPrimary}>
            Select {correctCount} correct options (Multiple Choice):
          </span>
        ) : (
          <span className={styles.textMuted}>
            Select 1 correct option:
          </span>
        )}
      </div>

      <div className={styles.optionsList}>
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedOptions.has(idx);
          let optionClass = styles.optionCard;
          if (hasAnswered) {
            if (opt.isCorrect) {
              optionClass += ` ${styles.correct}`;
            } else if (isSelected && !opt.isCorrect) {
              optionClass += ` ${styles.incorrect}`;
            }
          } else if (isSelected) {
            optionClass += ` ${styles.selected}`;
          }

          return (
            <div
              key={idx}
              onClick={() => onOptionToggle(idx, isMultipleChoice)}
              className={optionClass}
            >
              <span className={styles.optionIndex}>
                {String.fromCharCode(65 + idx)}
              </span>
              <div className={styles.optionContent}>{opt.text}</div>
            </div>
          );
        })}
      </div>

      <div>
        {!hasAnswered ? (
          <div className={styles.btnActionRow}>
            <button
              onClick={onEndQuiz}
              className={`${styles.btn} ${styles.btnSecondary} ${styles.wFull}`}
            >
              End & Submit
            </button>
            <button
              onClick={onCheckAnswer}
              disabled={selectedOptions.size === 0}
              className={`${styles.btn} ${styles.wFull}`}
            >
              Submit Answer
            </button>
          </div>
        ) : (
          <div>
            <div className={`${styles.feedbackPanel} ${isCurrentCorrect ? styles.correct : styles.incorrect}`}>
              <div className={styles.feedbackTitle}>
                {isCurrentCorrect ? "✓ Correct Answer!" : "✗ Incorrect Answer"}
              </div>
              {!isCurrentCorrect && (
                <div className={styles.feedbackDetails}>
                  <i>Correct Option(s):</i>
                  <div className={styles.mt1}>
                    {currentQuestion.options
                      .map((o, i) => (o.isCorrect ? `${String.fromCharCode(65 + i)}. ${o.text}` : null))
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.btnActionRow}>
              <button
                onClick={onEndQuiz}
                className={`${styles.btn} ${styles.btnSecondary} ${styles.wFull}`}
              >
                End & Submit
              </button>
              <button onClick={onNext} className={`${styles.btn} ${styles.wFull}`}>
                {currentIndex + 1 < totalQuestions ? "Next Question" : "Finish Test"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
