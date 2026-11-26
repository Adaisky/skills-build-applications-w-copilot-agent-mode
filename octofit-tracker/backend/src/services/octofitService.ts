import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function serviceError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) throw serviceError(400, 'Activity details are required');

  const { userId, teamId, type, minutes } = input;
  if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) {
    throw serviceError(400, 'userId must be a valid ID');
  }
  if (typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId)) {
    throw serviceError(400, 'teamId must be a valid ID');
  }
  if (typeof type !== 'string' || !type.trim()) throw serviceError(400, 'type is required');
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw serviceError(400, 'minutes must be a positive number');
  }

  const user = new Types.ObjectId(userId);
  const team = new Types.ObjectId(teamId);
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
  const memberIds = members.map((member) => {
    if (typeof member !== 'string' || !Types.ObjectId.isValid(member)) {
      throw serviceError(400, 'Each member must be a valid user ID');
    }
    return new Types.ObjectId(member);
  });
  const existingMembers = await User.find({ _id: { $in: memberIds } }).select('_id').lean();
  const existingIds = new Set(existingMembers.map((member) => member._id.toString()));
  if (memberIds.some((member) => !existingIds.has(member.toString()))) {
    throw serviceError(404, 'One or more team members were not found');
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });
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
    ? (({ run: 'endurance', cycle: 'endurance', walk: 'endurance', yoga: 'mobility' } as Record<string, string>)[activityType] ?? activityType)
    : undefined;
  const goal = user.fitnessGoal.toLowerCase();
  const candidateFocuses = [...new Set([goal, activityFocus].filter((focus): focus is string => Boolean(focus)))];

  let workouts: { _id: Types.ObjectId; title?: string | null; focus: string; minutes: number; difficulty: string }[] = [];
  let matchedFocus: string | undefined;
  for (const focus of candidateFocuses) {
    workouts = await Workout.find({ focus }).sort({ title: 1 }).lean();
    if (workouts.length > 0) {
      matchedFocus = focus;
      break;
    }
  }

  const reason = matchedFocus === goal
    ? `Recommended for your ${goal} goal${activityType ? ` and recent ${activityType} activity` : ''}.`
    : activityType
      ? `Recommended based on your recent ${activityType} activity.`
      : 'Recommended based on your fitness profile.';
  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
