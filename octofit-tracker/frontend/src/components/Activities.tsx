import { CapabilityCard } from './CapabilityCard.js';

type Activity = { type: string; minutes: number; points: number };
type ActivityResponse = { activities: Activity[] };

export default function Activities() {
  return <CapabilityCard<ActivityResponse>
    path="/api/activities"
    title="Activities"
    description="Track student activity minutes and points."
    emptyMessage="No activities yet."
    renderData={({ activities }) => activities.length > 0
      ? <ul>{activities.map((activity, index) => <li key={`${activity.type}-${index}`}>{activity.type}: {activity.minutes} minutes, {activity.points} points</li>)}</ul>
      : null}
  />;
}
