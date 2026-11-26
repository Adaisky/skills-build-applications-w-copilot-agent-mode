import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};
type WorkoutResponse = { suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const userEmail = encodeURIComponent('mona@example.com');
    getJson<WorkoutResponse>(`/api/workouts/suggestions/${userEmail}`).then((response) => {
      if (active) {
        setSuggestions(response.suggestions);
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
      <h2 className="h4">Workout suggestions</h2>
      <p>Recommend workouts from activity patterns.</p>
      {loading
        ? <p role="status">Loading workout suggestions...</p>
        : error
          ? <p role="alert">Unable to load workout suggestions: {error}</p>
          : suggestions.length === 0
            ? <p>No workout suggestions available.</p>
            : <ul>{suggestions.map((workout) => <li key={workout.title}>
              <strong>{workout.title}</strong>
              {workout.focus && ` — ${workout.focus}`}
              {workout.minutes !== undefined && `, ${workout.minutes} minutes`}
              {workout.difficulty && ` (${workout.difficulty})`}
              {workout.reason && `. ${workout.reason}`}
            </li>)}</ul>}
    </div>
  </section>;
}
