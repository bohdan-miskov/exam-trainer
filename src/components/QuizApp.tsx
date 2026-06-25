import React, { useState, useEffect, useRef } from "react";
import type { Question } from "../utils/parser";
import { fetchStats, submitQuizResults } from "../api";

import MenuScreen from "./MenuScreen/MenuScreen";
import QuizScreen from "./QuizScreen/QuizScreen";
import ResultsScreen from "./ResultsScreen/ResultsScreen";
import StatsScreen from "./StatsScreen/StatsScreen";

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
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(
    new Set(),
  );

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
  const [userAnswers, setUserAnswers] = useState<{
    [questionId: number]: Set<number>;
  }>({});

  // Стан таймера для симулятора іспиту
  const [timer, setTimer] = useState<number | null>(null);

  // Стан для повідомлень про помилки в меню
  const [menuError, setMenuError] = useState<string | null>(null);

  // Стан статистики
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Реф для обробки автосабміту при завершенні таймера
  const quizStateRef = useRef({
    score,
    currentQuestions,
    newWrongIds,
    clearedIds,
    quizMode,
  });
  quizStateRef.current = {
    score,
    currentQuestions,
    newWrongIds,
    clearedIds,
    quizMode,
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
    startQuiz(shuffled, "random");
  };

  // Ініціалізація тесту по помилках (до 20 питань)
  const startWrongQuiz = () => {
    const wrongQs = allQuestions.filter((q) => wrongIds.includes(q.id));
    if (wrongQs.length === 0) {
      setMenuError(
        "No incorrect answers recorded yet! Take a random quiz first.",
      );
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
        .filter((i) => i !== -1),
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
      await submitResults(
        score,
        currentQuestions.length,
        newWrongIds,
        clearedIds,
        quizMode,
      );
    }
  };

  // Автоматичне завершення тесту по закінченню часу
  const handleAutoSubmit = async () => {
    setTimer(null);
    const state = quizStateRef.current;
    await submitResults(
      state.score,
      state.currentQuestions.length,
      state.newWrongIds,
      state.clearedIds,
      state.quizMode,
    );
  };

  // Відправка результатів на бекенд
  const submitResults = async (
    finalScore: number,
    totalQs: number,
    finalWrongs: number[],
    finalCleared: number[],
    mode: QuizMode,
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
    <div className={styles.card}>
      {/* 1. MAIN MENU SCREEN */}
      {screen === "menu" && (
        <MenuScreen
          wrongCount={wrongIds.length}
          onStartRandom={startRandomQuiz}
          onStartExam={startExamSimulator}
          onStartWrong={startWrongQuiz}
          onViewStats={() => setScreen("stats")}
          menuError={menuError}
        />
      )}

      {/* 2. QUIZ INTERFACE SCREEN */}
      {screen === "quiz" && currentQuestions.length > 0 && (
        <QuizScreen
          quizMode={quizMode}
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
