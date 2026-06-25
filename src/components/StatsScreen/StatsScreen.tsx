import React from "react";
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
