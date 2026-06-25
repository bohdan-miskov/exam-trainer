import React, { useState, useEffect, useRef } from "react";
import type { Question } from "../utils/parser";
import { fetchStats, submitQuizResults, toggleBookmark, fetchAttemptDetails } from "../utils/api";

import MenuScreen, { AWS_TOPICS } from "./MenuScreen/MenuScreen";
import QuizScreen from "./QuizScreen/QuizScreen";
import ResultsScreen from "./ResultsScreen/ResultsScreen";
import StatsScreen from "./StatsScreen/StatsScreen";

import styles from "./QuizApp.module.css";

type Screen = "menu" | "quiz" | "results" | "stats";
type QuizMode = "random" | "wrong" | "exam" | "bookmark" | "topic";

interface Props {
  allQuestions: Question[];
  initialWrongIds: number[];
  initialBookmarkedIds: number[];
  initialScreen?: Screen;
  reviewAttemptId?: number;
}

export default function QuizApp({
  allQuestions,
  initialWrongIds,
  initialBookmarkedIds,
  initialScreen = "menu",
  reviewAttemptId,
}: Props) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
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

  // Локальний список неправильних ID
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

  // Стан для перегляду деталей минулої спроби
  const [reviewTitle, setReviewTitle] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState<number>(0);
  const [reviewTotal, setReviewTotal] = useState<number>(0);
  const [reviewMode, setReviewMode] = useState<string>("");
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [reviewAnswers, setReviewAnswers] = useState<{ [questionId: number]: Set<number> }>({});

  // Реф для обробки автосабміту при завершенні таймера
  const quizStateRef = useRef({ score, currentQuestions, newWrongIds, clearedIds, quizMode, userAnswers });
  quizStateRef.current = { score, currentQuestions, newWrongIds, clearedIds, quizMode, userAnswers };

  // Ініціалізація теми при першому рендерингу сторінки
  useEffect(() => {
    const savedTheme = localStorage.getItem("quiz-theme") as "dark" | "light" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    document.body?.setAttribute("data-theme", initialTheme);
  }, []);

  // Перемикання теми
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.body?.setAttribute("data-theme", nextTheme);
    localStorage.setItem("quiz-theme", nextTheme);
  };

  // Завантаження статистики при відкритті вкладки або зміні тижня
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

  // Завантаження деталей перегляду конкретної спроби
  useEffect(() => {
    if (screen === "results" && reviewAttemptId) {
      setIsLoadingStats(true);
      fetchAttemptDetails(reviewAttemptId)
        .then((rows) => {
          const mappedQs = rows
            .map((r) => allQuestions.find((q) => q.id === r.questionId))
            .filter((q): q is Question => !!q);

          const mappedAns = rows.reduce((acc: { [key: number]: Set<number> }, r) => {
            acc[r.questionId] = new Set(
              r.userChoices ? r.userChoices.split(",").map(Number) : []
            );
            return acc;
          }, {});

          const correctCount = rows.filter(r => r.isCorrect).length;

          setReviewTitle(`Attempt Review #${reviewAttemptId}`);
          setReviewScore(correctCount);
          setReviewTotal(rows.length);
          setReviewMode(rows.length > 0 ? "past_attempt" : "empty_attempt");
          setReviewQuestions(mappedQs);
          setReviewAnswers(mappedAns);
          setIsLoadingStats(false);
        })
        .catch((err) => {
          console.error("Failed to load attempt details:", err);
          setIsLoadingStats(false);
        });
    }
  }, [screen, reviewAttemptId]);

  // Парсинг параметрів та ініціалізація тесту на сторінці /quiz
  useEffect(() => {
    if (screen === "quiz") {
      const params = new URLSearchParams(window.location.search);
      const mode = (params.get("mode") || "random") as QuizMode;

      if (mode === "random") {
        const shuffled = [...allQuestions]
          .sort(() => 0.5 - Math.random())
          .slice(0, 20);
        setQuizTitle("Random Quiz");
        setCurrentQuestions(shuffled);
        setQuizMode("random");
      } else if (mode === "wrong") {
        const wrongQs = allQuestions.filter((q) => wrongIds.includes(q.id));
        if (wrongQs.length === 0) {
          window.location.href = "/?error=no_wrong_questions";
          return;
        }
        const shuffled = [...wrongQs].sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuizTitle("Incorrect Answers Review");
        setCurrentQuestions(shuffled);
        setQuizMode("wrong");
      } else if (mode === "bookmark") {
        const bookmarkQs = allQuestions.filter((q) => bookmarkedIds.includes(q.id));
        if (bookmarkQs.length === 0) {
          window.location.href = "/?error=no_bookmarks";
          return;
        }
        const shuffled = [...bookmarkQs].sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuizTitle("Bookmarked Questions");
        setCurrentQuestions(shuffled);
        setQuizMode("bookmark");
      } else if (mode === "exam") {
        const shuffled = [...allQuestions]
          .sort(() => 0.5 - Math.random())
          .slice(0, 65);
        setTimer(90 * 60); // 90 хвилин
        setQuizTitle("Exam Simulator");
        setCurrentQuestions(shuffled);
        setQuizMode("exam");
      } else if (mode === "topic") {
        const topicName = params.get("topic") || "";
        const keywordsStr = params.get("keywords") || "";
        let keywords = keywordsStr ? keywordsStr.split(",") : [];

        if (keywords.length === 0 && topicName) {
          const matchedTopic = AWS_TOPICS.find(
            (t) => t.name.toLowerCase() === topicName.toLowerCase() || t.id === topicName.toLowerCase()
          );
          if (matchedTopic) {
            keywords = matchedTopic.keywords;
          }
        }

        const matched = allQuestions.filter((q) => {
          const textToSearch = (q.text + " " + q.options.map((o) => o.text).join(" ")).toLowerCase();
          return keywords.some((kw) => textToSearch.includes(kw));
        });

        if (matched.length === 0) {
          window.location.href = "/?error=no_topic_questions";
          return;
        }

        const shuffled = [...matched].sort(() => 0.5 - Math.random()).slice(0, 20);
        setQuizTitle(`${topicName} Focus`);
        setCurrentQuestions(shuffled);
        setQuizMode("topic");
      }
    }
  }, [screen]);

  // Обробка помилок із URL на сторінці меню
  useEffect(() => {
    if (screen === "menu") {
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");
      if (error === "no_wrong_questions") {
        setMenuError("No incorrect answers recorded yet! Take a random quiz first.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error === "no_bookmarks") {
        setMenuError("No bookmarked questions yet! Toggle the Star icon during a quiz.");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error === "no_topic_questions") {
        setMenuError("No questions found for the selected topic.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [screen]);

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

  // Навігаційні переходи
  const startRandomQuiz = () => {
    window.location.href = "/quiz?mode=random";
  };

  const startWrongQuiz = () => {
    window.location.href = "/quiz?mode=wrong";
  };

  const startBookmarkQuiz = () => {
    window.location.href = "/quiz?mode=bookmark";
  };

  const startTopicQuiz = (topicName: string, keywords: string[]) => {
    window.location.href = `/quiz?mode=topic&topic=${encodeURIComponent(topicName)}&keywords=${encodeURIComponent(keywords.join(","))}`;
  };

  const startExamSimulator = () => {
    window.location.href = "/quiz?mode=exam";
  };

  // Додати/видалити закладку
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

  // Вибір варіанта відповіді
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

  // Перехід до наступного питання або завершення
  const handleNext = async () => {
    if (currentIndex + 1 < currentQuestions.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOptions(new Set());
      setHasAnswered(false);
    } else {
      setTimer(null);
      await submitResults(score, currentQuestions.length, newWrongIds, clearedIds, quizMode, userAnswers);
    }
  };

  // Дострокове завершення
  const handleEndQuiz = async () => {
    setTimer(null);
    const answeredQs = currentQuestions.filter((q) => userAnswers[q.id] !== undefined);

    if (answeredQs.length === 0) {
      window.location.href = "/";
      return;
    }

    await submitResults(score, answeredQs.length, newWrongIds, clearedIds, quizMode, userAnswers);
  };

  // Автосабміт
  const handleAutoSubmit = async () => {
    setTimer(null);
    const state = quizStateRef.current;
    const answeredQs = state.currentQuestions.filter((q) => state.userAnswers[q.id] !== undefined);
    const totalCount = answeredQs.length > 0 ? answeredQs.length : state.currentQuestions.length;

    await submitResults(state.score, totalCount, state.newWrongIds, state.clearedIds, state.quizMode, state.userAnswers);
  };

  // Відправка результатів на бекенд та перехід до перегляду
  const submitResults = async (
    finalScore: number,
    totalQs: number,
    finalWrongs: number[],
    finalCleared: number[],
    mode: QuizMode,
    answersLog: { [questionId: number]: Set<number> }
  ) => {
    try {
      const details = currentQuestions
        .filter((q) => answersLog[q.id] !== undefined)
        .map((q) => {
          const choices = answersLog[q.id];
          const correctIndices = new Set(
            q.options.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1)
          );
          const isCorrect =
            choices.size === correctIndices.size &&
            [...choices].every((v) => correctIndices.has(v));

          return {
            questionId: q.id,
            userChoices: [...choices].join(","),
            isCorrect,
          };
        });

      const res = await submitQuizResults({
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
        details,
      });

      if (res.success && res.attemptId) {
        window.location.href = `/review/${res.attemptId}?src=quiz`;
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Failed to submit quiz results:", err);
      window.location.href = "/";
    }
  };

  const handleReviewPastAttempt = (attemptId: number) => {
    window.location.href = `/review/${attemptId}`;
  };

  const handleReturnMenu = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("src") === "quiz") {
      window.location.href = "/";
    } else {
      window.location.href = "/stats";
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
          onViewStats={() => { window.location.href = "/stats"; }}
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
          onEndQuiz={handleEndQuiz}
          isBookmarked={bookmarkedIds.includes(currentQuestions[currentIndex].id)}
          onToggleBookmark={() => handleToggleBookmark(currentQuestions[currentIndex].id)}
        />
      )}

      {/* 3. TEST RESULTS SCREEN */}
      {screen === "results" && (
        <ResultsScreen
          score={reviewScore}
          total={reviewTotal}
          quizMode={reviewMode}
          newWrongIds={newWrongIds}
          clearedIds={clearedIds}
          currentQuestions={reviewQuestions}
          userAnswers={reviewAnswers}
          onReturnMenu={handleReturnMenu}
          title={reviewTitle || undefined}
        />
      )}

      {/* 4. STATISTICS AND PAST ATTEMPTS SCREEN */}
      {screen === "stats" && (
        <StatsScreen
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeek}
          statsData={statsData}
          isLoadingStats={isLoadingStats}
          onBack={() => { window.location.href = "/"; }}
          onReviewAttempt={handleReviewPastAttempt}
        />
      )}
    </div>
  );
}
