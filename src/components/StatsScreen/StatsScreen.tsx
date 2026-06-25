import React, { useState } from "react";
import styles from "./StatsScreen.module.css";

interface StatsScreenProps {
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  statsData: any;
  isLoadingStats: boolean;
  onBack: () => void;
}

export default function StatsScreen({
  selectedWeek,
  setSelectedWeek,
  statsData,
  isLoadingStats,
  onBack,
}: StatsScreenProps) {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const attempts = statsData?.rows || [];

  // Параметри розрахунку сітки для графіка
  const width = 500;
  const height = 160;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 25;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Розрахунок точок на SVG-координатах
  const points = attempts.map((row: any, i: number) => {
    const x = attempts.length > 1
      ? paddingLeft + (i / (attempts.length - 1)) * chartWidth
      : paddingLeft + chartWidth / 2;
    const y = paddingTop + (1 - row.percentage / 100) * chartHeight;
    return { x, y, row };
  });

  // Опис лінії тренду
  const pathD = points.length > 0
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")
    : "";

  // Опис заповнення під лінією тренду
  const fillD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  // Координата Y для лінії прохідного балу (80%)
  const passingLineY = paddingTop + (1 - 80 / 100) * chartHeight;

  return (
    <div>
      <div className={styles.statsHeaderRow}>
        <h2 className={`${styles.titleGradient} ${styles.m0}`}>Performance Stats</h2>
        <button
          onClick={onBack}
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
          {/* SVG Progress Trend Chart */}
          {attempts.length > 0 && (
            <div className={styles.chartContainer}>
              <div className={styles.chartTitle}>Progress Trend</div>
              
              {hoveredPoint ? (
                <div className={styles.chartTooltip}>
                  <div className={styles.chartTooltipTitle}>
                    {new Date(hoveredPoint.row.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div 
                    className={styles.chartTooltipVal} 
                    style={{ color: hoveredPoint.row.percentage >= 80 ? "var(--correct-text)" : "var(--text-color)" }}
                  >
                    Score: {hoveredPoint.row.percentage.toFixed(1)}% ({hoveredPoint.row.correct}/{hoveredPoint.row.total})
                  </div>
                </div>
              ) : (
                <div className={styles.chartTooltip} style={{ opacity: 0.5 }}>
                  Hover points to inspect
                </div>
              )}

              <svg viewBox={`0 0 ${width} ${height}`} className={styles.wFull} style={{ display: "block" }}>
                <defs>
                  {/* Лінійний градієнт для ліній */}
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                  {/* Градієнт для фонової заливки під графіком */}
                  <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Горизонтальні лінії сітки */}
                <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="rgba(255,255,255,0.1)" />

                {/* Лінія прохідного балу (Target Pass Line 80%) */}
                <line 
                  x1={paddingLeft} 
                  y1={passingLineY} 
                  x2={width - paddingRight} 
                  y2={passingLineY} 
                  stroke="var(--correct-border)" 
                  strokeDasharray="4,4" 
                  strokeOpacity="0.5"
                  strokeWidth="1.5"
                />
                <text 
                  x={width - paddingRight - 5} 
                  y={passingLineY - 4} 
                  fill="var(--correct-text)" 
                  fontSize="9" 
                  fontWeight="600" 
                  textAnchor="end"
                  opacity="0.8"
                >
                  Target Pass (80%)
                </text>

                {/* Позначки осі Y */}
                <text x={paddingLeft - 8} y={paddingTop + 3} fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">100%</text>
                <text x={paddingLeft - 8} y={paddingTop + chartHeight / 2 + 3} fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">50%</text>
                <text x={paddingLeft - 8} y={paddingTop + chartHeight + 3} fill="var(--text-muted)" fontSize="9" fontWeight="600" textAnchor="end">0%</text>

                {/* Заповнення фоном під графіком */}
                {fillD && <path d={fillD} fill="url(#areaGrad)" />}

                {/* Основна лінія тренду */}
                {pathD && <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                {/* Точки спроб */}
                {points.map((p: any, idx: number) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    className={styles.chartDot}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* Позначки осі X (дати першої, середньої та останньої спроби для збереження простору) */}
                {points.map((p: any, idx: number) => {
                  const shouldShowLabel = 
                    attempts.length <= 8 || 
                    idx === 0 || 
                    idx === attempts.length - 1 || 
                    idx === Math.floor(attempts.length / 2);
                  
                  if (!shouldShowLabel) return null;

                  const dateStr = new Date(p.row.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <text 
                      key={idx}
                      x={p.x} 
                      y={height - 8} 
                      fill="var(--text-muted)" 
                      fontSize="9" 
                      fontWeight="500" 
                      textAnchor="middle"
                    >
                      {dateStr}
                    </text>
                  );
                })}
              </svg>
            </div>
          )}

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
  );
}
