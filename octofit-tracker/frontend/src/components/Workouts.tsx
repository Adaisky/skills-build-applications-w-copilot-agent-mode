import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = { title: string; focus: string; minutes: number; difficulty: string; reason: string };
type WorkoutResponse = { suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  return <CapabilityCard<WorkoutResponse>
    path={`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`}
    title="Workout suggestions"
    description="Recommend workouts from activity patterns."
    emptyMessage="No workout suggestions available."
    renderData={({ suggestions }) => suggestions.length > 0
      ? <ul>{suggestions.map((workout) => <li key={workout.title}>
        <strong>{workout.title}</strong> — {workout.focus}, {workout.minutes} minutes ({workout.difficulty}). {workout.reason}
      </li>)}</ul>
      : null}
  />;
}
