import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectId(value: unknown, field: string) {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw serviceError(400, `${field} must be a valid ID`);
  }
  return new Types.ObjectId(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw serviceError(400, 'Activity details are required');
  const { userId, teamId, type, minutes } = input;
  const user = objectId(userId, 'userId');
  const team = objectId(teamId, 'teamId');
  if (typeof type !== 'string' || !type.trim()) throw serviceError(400, 'type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw serviceError(400, 'minutes must be a positive number');
  }

  const [existingUser, existingTeam] = await Promise.all([
    User.exists({ _id: user }),
    Team.exists({ _id: team }),
  ]);
  if (!existingUser) throw serviceError(404, 'User not found');
  if (!existingTeam) throw serviceError(404, 'Team not found');

  return Activity.create({
    user,
    team,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw serviceError(400, 'Team details are required');
  const { name, mascot } = input;
  if (typeof name !== 'string' || !name.trim()) throw serviceError(400, 'name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw serviceError(400, 'mascot is required');

  const members = input.members ?? [];
  if (!Array.isArray(members)) throw serviceError(400, 'members must be an array of user IDs');
  const memberIds = members.map((member) => objectId(member, 'member ID'));
  const existingMembers = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
  if (existingMembers.length !== memberIds.length) throw serviceError(404, 'One or more team members were not found');

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).lean();
  if (!user) throw serviceError(404, 'User not found');

  const recentActivity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityType = recentActivity?.type.toLowerCase();
  const activityFocus = activityType
    ? ({ run: 'endurance', cycle: 'endurance', walk: 'endurance', yoga: 'mobility' }[activityType] ?? activityType)
    : undefined;
  const goal = user.fitnessGoal.toLowerCase();
  const candidateFocuses = [...new Set([goal, activityFocus].filter((focus): focus is string => Boolean(focus)))];

  let workouts: { _id: Types.ObjectId; title: string; focus: string; minutes: number; difficulty: string }[] = [];
  let matchedFocus: string | undefined;
  for (const focus of candidateFocuses) {
    workouts = await Workout.find({ focus }).sort({ title: 1 }).lean();
    if (workouts.length > 0) {
      matchedFocus = focus;
      break;
    }
  }
  if (workouts.length === 0) workouts = await Workout.find().sort({ title: 1 }).limit(3).lean();

  const reason = matchedFocus === goal
    ? `Recommended for your ${goal} goal${activityType ? ` and recent ${activityType} activity` : ''}.`
    : activityType
      ? `Recommended based on your recent ${activityType} activity.`
      : 'Recommended based on your fitness profile.';
  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
