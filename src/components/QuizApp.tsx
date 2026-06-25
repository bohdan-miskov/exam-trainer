import React, { useState, useEffect, useRef } from "react";
import type { Question } from "../utils/parser";
import { fetchStats, submitQuizResults, toggleBookmark } from "../utils/api";

import MenuScreen from "./MenuScreen/MenuScreen";
import QuizScreen from "./QuizScreen/QuizScreen";
import ResultsScreen from "./ResultsScreen/ResultsScreen";
import StatsScreen from "./StatsScreen/StatsScreen";

import styles from "./QuizApp.module.css";

interface Props {
  allQuestions: Question[];
  initialWrongIds: number[];
  initialBookmarkedIds: number[];
}

type Screen = "menu" | "quiz" | "results" | "stats";
type QuizMode = "random" | "wrong" | "exam" | "bookmark" | "topic";

export default function QuizApp({ allQuestions, initialWrongIds, initialBookmarkedIds }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [quizMode, setQuizMode] = useState<QuizMode>("random");
  const [quizTitle, setQuizTitle] = useState<string>("Random Quiz");
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());

  // Стан для відображення зворотного зв'язку після відповіді
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState(false);

  // Світла/Темна тема
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Локальний список неправильних ID для уникнення перезавантаження сторінки
  const [wrongIds, setWrongIds] = useState<number[]>(initialWrongIds);

  // Локальний список закладок
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(initialBookmarkedIds);

  // Списки для збору результатів поточного тесту
  const [newWrongIds, setNewWrongIds] = useState<number[]>([]);
  const [clearedIds, setClearedIds] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  // Збереження відповідей користувача для підсумкового перегляду спроби
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

  // Ініціалізація теми при першому рендерингу сторінки
  useEffect(() => {
    const savedTheme = localStorage.getItem("quiz-theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    document.body.setAttribute("data-theme", initialTheme);
  }, []);

  // Перемикання теми
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.body.setAttribute("data-theme", nextTheme);
    localStorage.setItem("quiz-theme", nextTheme);
  };

  // Завантаження статистики з API при відкритті вкладки або зміні тижня
  useEffect(() => {
    if (screen === "stats") {
      setIsLoadingStats(true);
      fetchStats(selectedWeek)
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
    setQuizTitle("Random Quiz");
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
    setQuizTitle("Incorrect Answers Review");
    startQuiz(shuffled, "wrong");
  };

  // Ініціалізація тесту по закладках (до 20 питань)
  const startBookmarkQuiz = () => {
    const bookmarkQs = allQuestions.filter((q) => bookmarkedIds.includes(q.id));
    if (bookmarkQs.length === 0) {
      setMenuError("No bookmarked questions yet! Toggle the Star icon during a quiz.");
      setTimeout(() => setMenuError(null), 4000);
      return;
    }
    const shuffled = [...bookmarkQs].sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuizTitle("Bookmarked Questions");
    startQuiz(shuffled, "bookmark");
  };

  // Ініціалізація тематичного квізу за ключовими словами
  const startTopicQuiz = (topicName: string, keywords: string[]) => {
    const matched = allQuestions.filter((q) => {
      const textToSearch = (q.text + " " + q.options.map((o) => o.text).join(" ")).toLowerCase();
      return keywords.some((kw) => textToSearch.includes(kw));
    });

    if (matched.length === 0) {
      setMenuError(`No questions found for topic: ${topicName}`);
      setTimeout(() => setMenuError(null), 4000);
      return;
    }

    const shuffled = [...matched].sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuizTitle(`${topicName} Focus`);
    startQuiz(shuffled, "topic");
  };

  // Ініціалізація симулятора іспиту (65 питань, 90 хвилин)
  const startExamSimulator = () => {
    const shuffled = [...allQuestions]
      .sort(() => 0.5 - Math.random())
      .slice(0, 65);
    setTimer(90 * 60); // 90 хвилин в секундах
    setQuizTitle("Exam Simulator");
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

  // Додати/видалити закладку в БД та оновити локальний стан
  const handleToggleBookmark = async (qid: number) => {
    try {
      const res = await toggleBookmark(qid);
      setBookmarkedIds((prev) => {
        if (res.bookmarked) {
          return [...prev, qid];
        } else {
          return prev.filter((id) => id !== qid);
        }
      });
    } catch (err) {
      console.error("Failed to toggle bookmark:", err);
    }
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
      await submitQuizResults({
        correct: finalScore,
        total: totalQs,
        mode: 
          mode === "exam" 
            ? "exam_simulation" 
            : mode === "wrong" 
            ? "wrong_quiz" 
            : mode === "bookmark"
            ? "bookmark_quiz"
            : mode === "topic"
            ? "topic_focus_quiz"
            : "random_quiz",
        newWrongIds: finalWrongs,
        clearedIds: finalCleared,
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

  return (
    <div>
      {/* Перемикач світлої/темної теми */}
      <div className={styles.themeToggleContainer}>
        <button onClick={toggleTheme} className={styles.themeToggleBtn}>
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      {/* 1. MAIN MENU SCREEN */}
      {screen === "menu" && (
        <MenuScreen
          wrongCount={wrongIds.length}
          bookmarkedCount={bookmarkedIds.length}
          allQuestions={allQuestions}
          onStartRandom={startRandomQuiz}
          onStartExam={startExamSimulator}
          onStartWrong={startWrongQuiz}
          onStartBookmark={startBookmarkQuiz}
          onStartTopic={startTopicQuiz}
          onViewStats={() => setScreen("stats")}
          menuError={menuError}
        />
      )}

      {/* 2. QUIZ INTERFACE SCREEN */}
      {screen === "quiz" && currentQuestions.length > 0 && (
        <QuizScreen
          quizTitle={quizTitle}
          currentQuestion={currentQuestions[currentIndex]}
          currentIndex={currentIndex}
          totalQuestions={currentQuestions.length}
          selectedOptions={selectedOptions}
          hasAnswered={hasAnswered}
          isCurrentCorrect={isCurrentCorrect}
          timer={timer}
          formatSeconds={formatSeconds}
          onOptionToggle={handleOptionToggle}
          onCheckAnswer={handleCheckAnswer}
          onNext={handleNext}
          isBookmarked={bookmarkedIds.includes(currentQuestions[currentIndex].id)}
          onToggleBookmark={() => handleToggleBookmark(currentQuestions[currentIndex].id)}
        />
      )}

      {/* 3. TEST RESULTS SCREEN */}
      {screen === "results" && (
        <ResultsScreen
          score={score}
          total={currentQuestions.length}
          quizMode={quizMode}
          newWrongIds={newWrongIds}
          clearedIds={clearedIds}
          currentQuestions={currentQuestions}
          userAnswers={userAnswers}
          onReturnMenu={() => setScreen("menu")}
        />
      )}

      {/* 4. STATISTICS AND PAST ATTEMPTS SCREEN */}
      {screen === "stats" && (
        <StatsScreen
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          statsData={statsData}
          isLoadingStats={isLoadingStats}
          onBack={() => setScreen("menu")}
        />
      )}
    </div>
  );
}
