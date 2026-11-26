import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<LeaderboardResponse>('/api/leaderboard').then((response) => {
      if (active) {
        setLeaderboard(response.leaderboard);
        setLoading(false);
      }
    }).catch((requestError: unknown) => {
      if (active) {
        setError(requestError instanceof Error ? requestError.message : 'The request failed.');
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return <section className="card h-100">
    <div className="card-body">
      <h2 className="h4">Leaderboard</h2>
      <p>Compare team point totals.</p>
      {loading
        ? <p role="status">Loading leaderboard...</p>
        : error
          ? <p role="alert">Unable to load leaderboard: {error}</p>
          : leaderboard.length === 0
            ? <p>No leaderboard rankings yet.</p>
            : <ol>{leaderboard.map((entry) => <li key={entry.teamName}>
              {entry.teamName}: {entry.totalPoints} points
            </li>)}</ol>}
    </div>
  </section>;
}
