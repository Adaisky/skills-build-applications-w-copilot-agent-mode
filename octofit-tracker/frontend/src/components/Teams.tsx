import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; mascot?: string; members?: string[] };
type TeamResponse = { teams: Team[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getJson<TeamResponse>('/api/teams').then((response) => {
      if (active) {
        setTeams(response.teams);
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
      <h2 className="h4">Teams</h2>
      <p>Manage teams and members.</p>
      {loading
        ? <p role="status">Loading teams...</p>
        : error
          ? <p role="alert">Unable to load teams: {error}</p>
          : teams.length === 0
            ? <p>No teams yet.</p>
            : <ul>{teams.map((team) => <li key={team.name}>
              {team.name}{team.mascot ? ` — ${team.mascot}` : ''}
              {team.members ? ` (${team.members.length} members)` : ''}
            </li>)}</ul>}
    </div>
  </section>;
}
