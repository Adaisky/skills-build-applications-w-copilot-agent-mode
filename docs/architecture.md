# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep API fetching in the shared client/card flow and render each capability's returned data in its route component. Show accessible loading, empty, and error states.
- Logic tier decision: Keep request validation and business behavior in the service layer; return explicit 4xx errors for invalid or missing resources.
- Data tier decision: Make the contract fields required in Mongoose, default team members to an empty array, and seed stable related demo records with upserts.
- Activity tracking approach: Validate both IDs and their records, require a non-empty type and positive minutes, then store points equal to minutes and a server-generated timestamp.
- Team management approach: Require a name and mascot, validate supplied member IDs, and persist the team with its member references.
- Leaderboard approach: Sum activity points per team, include teams with no activity at zero, sort descending, and assign 1-based ranks.
- Workout suggestions approach: Find the requested user, match workouts to their goal (or recent activity when needed), and explain the recommendation; return 404 for unknown emails.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — failures indicate model validation/defaults or idempotent, non-destructive seed behavior is incorrect.
- API command: `npm run test:api --prefix octofit-tracker/backend` — failures indicate endpoint validation, persistence, ranking, or recommendation behavior violates the API contract.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — failures indicate route data rendering, workout URL construction, or accessible loading/empty/error states are incorrect.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — failures indicate backend TypeScript does not type-check.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — failures indicate frontend TypeScript or the production Vite build fails.

Validation result: backend tests passed (9/9), frontend tests passed (15/15), and both production builds passed.
