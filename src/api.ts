// Client API requests for the Quiz application

export interface SubmitResultsPayload {
  correct: number;
  total: number;
  mode: string;
  newWrongIds: number[];
  clearedIds: number[];
}

export async function submitQuizResults(payload: SubmitResultsPayload): Promise<{ success: boolean }> {
  const response = await fetch("/api/results", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit quiz results. Status: ${response.status}`);
  }

  return response.json();
}

export interface StatsResponse {
  period: string;
  totalCorrect: number;
  totalTotal: number;
  overallPct: string;
  rows: {
    id: number;
    timestamp: string;
    correct: number;
    total: number;
    percentage: number;
  }[];
}

export async function fetchStats(week: number): Promise<StatsResponse> {
  const response = await fetch(`/api/stats?week=${week}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch performance stats. Status: ${response.status}`);
  }

  return response.json();
}
