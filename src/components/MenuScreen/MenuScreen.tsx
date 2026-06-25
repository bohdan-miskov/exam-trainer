import React from "react";
import styles from "./MenuScreen.module.css";

interface MenuScreenProps {
  wrongCount: number;
  onStartRandom: () => void;
  onStartExam: () => void;
  onStartWrong: () => void;
  onViewStats: () => void;
  menuError: string | null;
}

export default function MenuScreen({
  wrongCount,
  onStartRandom,
  onStartExam,
  onStartWrong,
  onViewStats,
  menuError,
}: MenuScreenProps) {
  return (
    <div className={styles.menuContainer}>
      <div className={styles.menuHeader}>
        <h1 className={styles.titleGradient}>AWS Practice Quiz</h1>
        <p className={styles.menuSubtitle}>Prepare for your AWS Certification Exams</p>
      </div>

      {menuError && (
        <div className={`${styles.feedbackPanel} ${styles.incorrect}`}>
          <div className={styles.feedbackTitle}>{menuError}</div>
        </div>
      )}

      <button onClick={onStartRandom} className={styles.btn}>
        Take a Random Quiz (20 Qs)
      </button>
      <button onClick={onStartExam} className={styles.btn}>
        Start Exam Simulator (65 Qs - 90 mins)
      </button>
      <button onClick={onStartWrong} className={`${styles.btn} ${styles.btnSecondary}`}>
        Review Incorrect Answers ({wrongCount})
      </button>
      <button onClick={onViewStats} className={`${styles.btn} ${styles.btnSecondary}`}>
        View Performance Stats
      </button>
    </div>
  );
}
