import React from 'react';
import type { Match, Team, Tournament, User } from '../types/tournament';

interface SingleEliminationBracketProps {
  tournament: Tournament;
  matches: Match[];
  teams: Team[];
  variant?: 'embedded' | 'fullscreen';
  isAdmin?: boolean;
  currentUser?: User | null;
  onUpdate?: () => void;
}

const getTeamName = (teams: Team[], teamId: string | null | undefined) => {
  if (!teamId) return 'TBD';
  const t = teams.find(x => x.id === teamId);
  return t?.name || 'TBD';
};

const getFormatTag = (match: Match, tournament: Tournament) => {
  if (match.matchFormat) return match.matchFormat;
  return tournament.format?.matchFormat || 'BO1';
};

const getVisualMatchNumber = (match: Match, allMatches: Match[]): number => {
  const sorted = [...allMatches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });
  const idx = sorted.findIndex(m => m.id === match.id);
  return idx >= 0 ? idx + 1 : match.matchNumber;
};

const MatchCard: React.FC<{
  match: Match;
  teams: Team[];
  allMatches: Match[];
  tournament: Tournament;
}> = ({ match, teams, allMatches, tournament }) => {
  const team1 = getTeamName(teams, match.team1Id);
  const team2 = getTeamName(teams, match.team2Id);
  const format = getFormatTag(match, tournament);
  const visualMatchNumber = getVisualMatchNumber(match, allMatches);

  return (
    <div className="relative match-card-container">
      <div className="w-full text-left bg-black/30 border border-gray-800 hover:border-red-600 transition-colors relative">
        <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            #{visualMatchNumber}
          </div>
          <div className="text-xs text-red-500 font-mono uppercase tracking-widest">
            {format}
          </div>
        </div>

        <div
          className="w-full cursor-pointer"
          onClick={() => {
            // eslint-disable-next-line no-restricted-globals
            location.href = `/match/${match.id}`;
          }}
        >
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-white font-bodax uppercase tracking-wide text-lg truncate flex-1 min-w-0">
                {team1}
              </div>
              <div className="text-gray-300 font-mono text-lg">
                {match.isComplete ? match.team1Score : 0}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-white font-bodax uppercase tracking-wide text-lg truncate flex-1 min-w-0">
                {team2}
              </div>
              <div className="text-gray-300 font-mono text-lg">
                {match.isComplete ? match.team2Score : 0}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-800">
              <div className="text-[11px] font-mono uppercase tracking-widest text-gray-500">
                Round {match.round}
              </div>
              <div className={`text-[11px] font-mono uppercase tracking-widest ${
                match.isComplete ? 'text-gray-400' : match.matchState === 'ready_up' ? 'text-yellow-400' : 'text-gray-500'
              }`}>
                {match.isComplete ? 'Completed' : match.matchState?.replace(/_/g, ' ') || 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoundColumn: React.FC<{
  title: string;
  matches: Match[];
  teams: Team[];
  allMatches: Match[];
  tournament: Tournament;
}> = ({ title, matches, teams, allMatches, tournament }) => {
  return (
    <div className="min-w-[260px]">
      <div className="mb-3">
        <div className="text-gray-300 font-mono uppercase tracking-widest text-xs">{title}</div>
        <div className="mt-1.5 h-px bg-gray-800" />
      </div>
      <div className="space-y-3">
        {matches.map(m => (
          <MatchCard key={m.id} match={m} teams={teams} allMatches={allMatches} tournament={tournament} />
        ))}
      </div>
    </div>
  );
};

const SingleEliminationBracket: React.FC<SingleEliminationBracketProps> = ({
  tournament,
  matches,
  teams,
  variant = 'embedded',
}) => {
  const viewVariant: 'embedded' | 'fullscreen' = variant;

  const singleElimMatches = matches
    .filter(m => m.tournamentType === 'single-elim')
    .sort((a, b) => (a.round !== b.round ? a.round - b.round : a.matchNumber - b.matchNumber));

  const maxRound = singleElimMatches.length ? Math.max(...singleElimMatches.map(m => m.round)) : 0;

  const getRoundTitle = (round: number) => {
    if (round === maxRound) return 'Finale';
    return `Runde ${round}`;
  };

  const PlaceholderCard: React.FC<{ round: number; matchIndex: number }> = ({ round, matchIndex }) => {
    const format = tournament.format?.matchFormat || 'BO1';
    return (
      <div className="relative match-card-container">
        <div className="w-full text-left bg-black/30 border border-gray-800 relative">
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
              Match {matchIndex}
            </div>
            <div className="text-xs text-red-500 font-mono uppercase tracking-widest">
              {format}
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-white font-bodax uppercase tracking-wide text-lg truncate flex-1 min-w-0">
                TBD
              </div>
              <div className="text-gray-600 font-mono text-lg">—</div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-white font-bodax uppercase tracking-wide text-lg truncate flex-1 min-w-0">
                TBD
              </div>
              <div className="text-gray-600 font-mono text-lg">—</div>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-gray-800">
              <div className="text-[11px] font-mono uppercase tracking-widest text-gray-500">
                Round {round}
              </div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-gray-500">
                Pending
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={viewVariant === 'fullscreen' ? '' : 'bg-[#0a0a0a] border border-gray-800 p-6 relative overflow-hidden'}>
      {viewVariant !== 'fullscreen' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      )}

      <div className="relative">
        {viewVariant !== 'fullscreen' && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                Bracket <span className="text-red-500">Single Elimination</span>
              </h2>
              <div className="mt-2 text-gray-400 font-mono uppercase tracking-widest text-sm">
                {tournament.name}
              </div>
            </div>
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
              Click a match to open
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="mb-4">
              <div className="text-green-400 font-mono uppercase tracking-widest text-sm font-bold mb-2">
                Bracket
              </div>
              <div className="h-px bg-gradient-to-r from-green-500 via-green-400 to-transparent" />
            </div>
            <div className="flex gap-4 items-center">
              {singleElimMatches.length === 0 ? (
                (() => {
                  const teamCount = tournament.format?.teamCount || 8;
                  const rounds = Math.max(1, Math.ceil(Math.log2(teamCount)));
                  const getLabel = (r: number) => (r === rounds ? 'Finale' : `Runde ${r}`);
                  const getMatchCount = (r: number) => Math.max(1, Math.ceil(teamCount / Math.pow(2, r)));
                  return Array.from({ length: rounds }).map((_, idx) => {
                    const r = idx + 1;
                    const matchCount = getMatchCount(r);
                    return (
                      <div key={`se-empty-${r}`} className="min-w-[260px]">
                        <div className="mb-3">
                          <div className="text-gray-300 font-mono uppercase tracking-widest text-xs">{getLabel(r)}</div>
                          <div className="mt-1.5 h-px bg-gray-800" />
                        </div>
                        <div className="space-y-3">
                          {Array.from({ length: Math.min(matchCount, 6) }).map((__, i) => (
                            <PlaceholderCard key={`se-empty-${r}-${i}`} round={r} matchIndex={i + 1} />
                          ))}
                          {matchCount > 6 && (
                            <div className="text-gray-600 font-mono text-xs italic">
                              + {matchCount - 6} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                Array.from({ length: maxRound }).map((_, idx) => {
                  const r = idx + 1;
                  const rm = singleElimMatches.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber);
                  if (rm.length === 0) return null;
                  return (
                    <RoundColumn
                      key={`se-${r}`}
                      title={getRoundTitle(r)}
                      matches={rm}
                      teams={teams}
                      allMatches={singleElimMatches}
                      tournament={tournament}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleEliminationBracket;


