import React, { useState, useEffect, useRef } from "react";
import type { Question } from "../../utils/parser";
import styles from "./QuizApp.module.css";

interface Props {
  allQuestions: Question[];
  initialWrongIds: number[];
}

type Screen = "menu" | "quiz" | "results" | "stats";
type QuizMode = "random" | "wrong" | "exam";

export default function QuizApp({ allQuestions, initialWrongIds }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [quizMode, setQuizMode] = useState<QuizMode>("random");
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());

  // Стан для відображення зворотного зв'язку після відповіді
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);

  // Локальний список неправильних ID для уникнення перезавантаження сторінки
  const [wrongIds, setWrongIds] = useState<number[]>(initialWrongIds);

  // Списки для збору результатів поточного тесту
  const [newWrongIds, setNewWrongIds] = useState<number[]>([]);
  const [clearedIds, setClearedIds] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  // Збереження відповідей користувача для фінального перегляду спроби
  const [userAnswers, setUserAnswers] = useState<{ [questionId: number]: Set<number> }>({});

  // Стан таймера для симулятора іспиту
  const [timer, setTimer] = useState<number | null>(null);

  // Стан для повідомлень про помилки в меню
  const [menuError, setMenuError] = useState<string | null>(null);

  // Стан статистики
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Реф для обробки автосабміту при завершенні таймера
  const quizStateRef = useRef({ score, currentQuestions, newWrongIds, clearedIds, quizMode });
  quizStateRef.current = { score, currentQuestions, newWrongIds, clearedIds, quizMode };

  // Завантаження статистики з API при відкритті вкладки або зміні тижня
  useEffect(() => {
    if (screen === "stats") {
      setIsLoadingStats(true);
      fetch(`/api/stats?week=${selectedWeek}`)
        .then((res) => res.json())
        .then((data) => {
          setStatsData(data);
          setIsLoadingStats(false);
        })
        .catch((err) => {
          console.error("Failed to load statistics:", err);
          setIsLoadingStats(false);
        });
    }
  }, [screen, selectedWeek]);

  // Ефект таймера зворотного відліку
  useEffect(() => {
    if (timer === null) return;

    if (timer <= 0) {
      handleAutoSubmit();
      return;
    }

    const intervalId = setInterval(() => {
      setTimer((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timer]);

  // Ініціалізація випадкового тесту (20 питань)
  const startRandomQuiz = () => {
    const shuffled = [...allQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);
    startQuiz(shuffled, "random");
  };

  // Ініціалізація тесту по помилках (до 20 питань)
  const startWrongQuiz = () => {
    const wrongQs = allQuestions.filter((q) => wrongIds.includes(q.id));
    if (wrongQs.length === 0) {
      setMenuError("No incorrect answers recorded yet! Take a random quiz first.");
      setTimeout(() => setMenuError(null), 4000);
      return;
    }
    const shuffled = [...wrongQs].sort(() => 0.5 - Math.random()).slice(0, 20);
    startQuiz(shuffled, "wrong");
  };

  // Ініціалізація симулятора іспиту (65 питань, 90 хвилин)
  const startExamSimulator = () => {
    const shuffled = [...allQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 65);
    setTimer(90 * 60); // 90 хвилин в секундах
    startQuiz(shuffled, "exam");
  };

  const startQuiz = (questions: Question[], mode: QuizMode) => {
    setCurrentQuestions(questions);
    setQuizMode(mode);
    setCurrentIndex(0);
    setScore(0);
    setNewWrongIds([]);
    setClearedIds([]);
    setSelectedOptions(new Set());
    setHasAnswered(false);
    setUserAnswers({});
    setScreen("quiz");
  };

  // Вибір варіанта відповіді (одиничний чи множинний вибір)
  const handleOptionToggle = (idx: number, isMultiple: boolean) => {
    if (hasAnswered) return;
    const next = new Set(selectedOptions);
    if (isMultiple) {
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
    } else {
      next.clear();
      next.add(idx);
    }
    setSelectedOptions(next);
  };

  // Перевірка поточної відповіді
  const handleCheckAnswer = () => {
    const currentQ = currentQuestions[currentIndex];
    const correctIndices = new Set(
      currentQ.options
        .map((opt, i) => (opt.isCorrect ? i : -1))
        .filter((i) => i !== -1)
    );

    const isCorrect =
      selectedOptions.size === correctIndices.size &&
      [...selectedOptions].every((val) => correctIndices.has(val));

    setIsCurrentCorrect(isCorrect);
    setHasAnswered(true);

    // Зберігаємо вибір користувача для підсумкового перегляду
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: new Set(selectedOptions),
    }));

    if (isCorrect) {
      setScore((s) => s + 1);
      if (quizMode === "wrong") {
        setClearedIds((prev) => {
          if (prev.includes(currentQ.id)) return prev;
          return [...prev, currentQ.id];
        });
      }
    } else {
      setNewWrongIds((prev) => {
        if (prev.includes(currentQ.id)) return prev;
        return [...prev, currentQ.id];
      });
    }
  };

  // Перехід до наступного питання або завершення тесту
  const handleNext = async () => {
    if (currentIndex + 1 < currentQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOptions(new Set());
      setHasAnswered(false);
    } else {
      // Зупиняємо таймер якщо він працював
      setTimer(null);
      await submitResults(score, currentQuestions.length, newWrongIds, clearedIds, quizMode);
    }
  };

  // Автоматичне завершення тесту по закінченню часу
  const handleAutoSubmit = async () => {
    setTimer(null);
    const state = quizStateRef.current;
    await submitResults(state.score, state.currentQuestions.length, state.newWrongIds, state.clearedIds, state.quizMode);
  };

  // Відправка результатів на бекенд
  const submitResults = async (
    finalScore: number,
    totalQs: number,
    finalWrongs: number[],
    finalCleared: number[],
    mode: QuizMode
  ) => {
    try {
      await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correct: finalScore,
          total: totalQs,
          mode: mode === "exam" ? "exam_simulation" : mode === "wrong" ? "wrong_quiz" : "random_quiz",
          newWrongIds: finalWrongs,
          clearedIds: finalCleared,
        }),
      });

      // Оновлюємо локальний список помилок без перезавантаження
      setWrongIds((prev) => {
        const next = new Set(prev);
        finalWrongs.forEach((id) => next.add(id));
        finalCleared.forEach((id) => next.delete(id));
        return Array.from(next);
      });

      setScreen("results");
    } catch (err) {
      console.error("Failed to submit quiz results:", err);
      setScreen("results");
    }
  };

  // Отримуємо кількість правильних варіантів для поточного питання
  const getCorrectOptionsCount = (question: Question) => {
    return question.options.filter((o) => o.isCorrect).length;
  };

  // Форматування секунд у HH:MM:SS
  const formatSeconds = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours > 0 ? hours.toString().padStart(2, "0") : null,
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  };

  const isPass = currentQuestions.length > 0 && (score / currentQuestions.length) >= 0.8;

  return (
    <div className={styles.card}>
      {/* 1. MAIN MENU SCREEN */}
      {screen === "menu" && (
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

          <button onClick={startRandomQuiz} className={styles.btn}>
            Take a Random Quiz (20 Qs)
          </button>
          <button onClick={startExamSimulator} className={styles.btn}>
            Start Exam Simulator (65 Qs - 90 mins)
          </button>
          <button onClick={startWrongQuiz} className={`${styles.btn} ${styles.btnSecondary}`}>
            Review Incorrect Answers ({wrongIds.length})
          </button>
          <button onClick={() => setScreen("stats")} className={`${styles.btn} ${styles.btnSecondary}`}>
            View Performance Stats
          </button>
        </div>
      )}

      {/* 2. QUIZ INTERFACE SCREEN */}
      {screen === "quiz" && currentQuestions.length > 0 && (
        <div>
          <div className={styles.quizHeader}>
            <span className={`${styles.quizBadge} ${styles.textCapitalize}`}>
              {quizMode} Quiz
            </span>

            {/* Countdown Timer for Exam Mode */}
            {timer !== null && (
              <span className={`${styles.timerContainer} ${timer < 300 ? styles.timerWarning : ""}`}>
                ⏱ {formatSeconds(timer)}
              </span>
            )}

            <span className={styles.quizBadge}>
              Question {currentIndex + 1} of {currentQuestions.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressContainer}>
            <div
              className={styles.progressBar}
              style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
            />
          </div>

          <p className={styles.questionText}>
            {currentQuestions[currentIndex].text}
          </p>

          {/* Selection Hint (helps user select correct amount of options) */}
          <div className={styles.selectionHint}>
            {getCorrectOptionsCount(currentQuestions[currentIndex]) > 1 ? (
              <span className={styles.textPrimary}>
                Select {getCorrectOptionsCount(currentQuestions[currentIndex])} correct options (Multiple Choice):
              </span>
            ) : (
              <span className={styles.textMuted}>
                Select 1 correct option:
              </span>
            )}
          </div>

          <div className={styles.optionsList}>
            {currentQuestions[currentIndex].options.map((opt, idx) => {
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
                  onClick={() =>
                    handleOptionToggle(
                      idx,
                      getCorrectOptionsCount(currentQuestions[currentIndex]) > 1
                    )
                  }
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
                  onClick={handleCheckAnswer}
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
                        {currentQuestions[currentIndex].options
                          .map((o, i) => (o.isCorrect ? `${String.fromCharCode(65 + i)}. ${o.text}` : null))
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.btnActionRow}>
                  <button onClick={handleNext} className={`${styles.btn} ${styles.wFull}`}>
                    {currentIndex + 1 < currentQuestions.length ? "Next Question" : "Finish Test"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TEST RESULTS SCREEN */}
      {screen === "results" && (
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
                  strokeDashoffset={314.16 - (314.16 * (currentQuestions.length > 0 ? score / currentQuestions.length : 0))}
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
                {currentQuestions.length > 0 ? Math.round((score / currentQuestions.length) * 100) : 0}%
              </div>
            </div>

            <div className={styles.textCenter}>
              <div className={styles.resultsScoreText}>
                {score} / {currentQuestions.length} Correct
              </div>
              <p className={`${styles.resultsFeedback} ${isPass ? styles.textCorrect : ""}`}>
                {currentQuestions.length > 0 && score / currentQuestions.length === 1 ? (
                  "Perfect Score! 🌟 Ready for the exam!"
                ) : currentQuestions.length > 0 && score / currentQuestions.length >= 0.8 ? (
                  "Passing Score! 🎉 Excellent progress."
                ) : currentQuestions.length > 0 && score / currentQuestions.length >= 0.6 ? (
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

          {/* New Feature: Detailed Question Review List */}
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

          <button onClick={() => setScreen("menu")} className={`${styles.btn} ${styles.wFull} ${styles.mt1}`} style={{ marginTop: "24px" }}>
            Return to Main Menu
          </button>
        </div>
      )}

      {/* 4. STATISTICS AND PAST ATTEMPTS SCREEN */}
      {screen === "stats" && (
        <div>
          <div className={styles.statsHeaderRow}>
            <h2 className={`${styles.titleGradient} ${styles.m0}`}>Performance Stats</h2>
            <button
              onClick={() => setScreen("menu")}
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
            >
              Back to Menu
            </button>
          </div>

          <div className={styles.statsPeriodSelector}>
            <label htmlFor="period-select">Select Period:</label>
            <select
              id="period-select"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              <option value={1}>Current week (last 7 days)</option>
              <option value={2}>Previous week</option>
              <option value={3}>2 weeks ago</option>
              <option value={4}>3 weeks ago</option>
            </select>
          </div>

          {isLoadingStats ? (
            <div className={styles.statsLoading}>
              <div className={styles.statsSpinner}></div>
              <p className={styles.textMuted}>Loading statistics...</p>
            </div>
          ) : statsData ? (
            <div className={styles.fadeIn}>
              <div className={styles.statsMeta}>
                <strong className={styles.textMuted}>Period:</strong> {statsData.period}
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total Correct</div>
                  <div className={styles.statVal}>{statsData.totalCorrect}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total Answered</div>
                  <div className={styles.statVal}>{statsData.totalTotal}</div>
                </div>
                <div className={`${styles.statCard} ${styles.span2}`}>
                  <div className={styles.statLabel}>Overall Success Rate</div>
                  <div className={`${styles.statVal} ${styles.percentage}`}>
                    {parseFloat(statsData.overallPct).toFixed(1)}%
                  </div>
                </div>
              </div>

              <h3 className={styles.statsHistoryTitle}>Attempt History</h3>
              {statsData.rows && statsData.rows.length > 0 ? (
                <div className={styles.tableContainer}>
                  <table className={styles.statsTable}>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Correct</th>
                        <th>Total</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsData.rows.map((row: any) => {
                        const pct = row.percentage;
                        let badgeClass = styles.percentageBadge;
                        if (pct >= 80) badgeClass += ` ${styles.high}`;
                        else if (pct >= 60) badgeClass += ` ${styles.mid}`;
                        else badgeClass += ` ${styles.low}`;

                        const dateObj = new Date(row.timestamp);
                        const formattedDate = dateObj.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        });
                        const formattedTime = dateObj.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false
                        });

                        return (
                          <tr key={row.id}>
                            <td>
                              <div>{formattedDate}</div>
                              <div className={`${styles.textMuted} ${styles.timestampTime}`}>
                                {formattedTime}
                              </div>
                            </td>
                            <td>{row.correct}</td>
                            <td>{row.total}</td>
                            <td>
                              <span className={badgeClass}>{pct.toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.noAttempts}>
                  No quiz attempts recorded in this period.
                </div>
              )}
            </div>
          ) : (
            <div className={styles.noAttempts}>
              Failed to fetch statistics.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
