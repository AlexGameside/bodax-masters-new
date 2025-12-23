import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Match, Team, Tournament } from '../types/tournament';
import { getTournamentById, getTournamentMatches, getTeams } from '../services/firebaseService';
import DoubleEliminationBracket from '../components/DoubleEliminationBracket';
import TournamentBracket from '../components/TournamentBracket';
import GroupStageBracket from '../components/GroupStageBracket';

interface TournamentBracketPageProps {
  currentUser?: any;
}

const TournamentBracketPage: React.FC<TournamentBracketPageProps> = ({ currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const reloadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [t, m, allTeams] = await Promise.all([
        getTournamentById(id),
        getTournamentMatches(id),
        getTeams(currentUser?.id, Boolean(currentUser?.isAdmin)),
      ]);
      setTournament(t);
      setMatches(m);
      setTeams(allTeams);
    } catch (e: any) {
      setError(e?.message || 'Failed to load bracket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const [t, m, allTeams] = await Promise.all([
          getTournamentById(id),
          getTournamentMatches(id),
          getTeams(currentUser?.id, Boolean(currentUser?.isAdmin)),
        ]);
        if (cancelled) return;
        setTournament(t);
        setMatches(m);
        setTeams(allTeams);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load bracket');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, currentUser?.id, currentUser?.isAdmin]);

  const isDoubleElim = useMemo(() => tournament?.format?.type === 'double-elimination', [tournament?.format?.type]);

  return (
    <div className="min-h-screen bg-[#050505] relative">
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(50, 50, 50, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 border-b border-gray-800 bg-black/40 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-red-500 transition-colors mt-1"
              aria-label="Back"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white font-bodax tracking-wide uppercase leading-none">
                Bracket
              </h1>
              <div className="mt-2 text-sm text-gray-400 font-mono uppercase tracking-widest">
                {tournament?.name || 'Tournament'} · {isDoubleElim ? 'Double Elimination' : 'Bracket View'}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">
            Scroll to explore · click a match to open
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="bg-black/30 border border-gray-800 p-6 text-gray-300 font-mono uppercase tracking-widest text-sm">
            Loading bracket...
          </div>
        ) : error ? (
          <div className="bg-red-900/10 border border-red-900 p-6 text-red-300 font-mono uppercase tracking-widest text-sm">
            {error}
          </div>
        ) : !tournament ? (
          <div className="bg-black/30 border border-gray-800 p-6 text-gray-300 font-mono uppercase tracking-widest text-sm">
            Tournament not found.
          </div>
        ) : tournament.type === 'group-stage-single-elim' ? (
          <GroupStageBracket tournament={tournament} matches={matches} teams={teams} />
        ) : tournament.format?.type === 'double-elimination' ? (
          <DoubleEliminationBracket 
            tournament={tournament} 
            matches={matches} 
            teams={teams} 
            variant="fullscreen" 
            isAdmin={currentUser?.isAdmin}
            currentUser={currentUser}
            onUpdate={reloadData}
          />
        ) : (
          <TournamentBracket tournament={tournament} matches={matches} teams={teams} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};

export default TournamentBracketPage;


