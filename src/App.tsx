import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CountdownPage from './pages/CountdownPage';
import LandingPage from './pages/LandingPage';
import UserRegistration from './pages/UserRegistration';
import UserLogin from './pages/UserLogin';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import TeamRegistration from './pages/TeamRegistration';
import TeamManagement from './pages/TeamManagement';
import CreateTeam from './pages/CreateTeam';
import AdminPanel from './pages/AdminPanel';
import MatchPage from './pages/MatchPage';
import TournamentList from './pages/TournamentList';
import TournamentCreation from './pages/TournamentCreation';
import TournamentDetail from './pages/TournamentDetail';
import TournamentManagement from './pages/TournamentManagement';
import ConnectionStatus from './components/ConnectionStatus';
// Footer pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import GDPR from './pages/GDPR';
import ContactUs from './pages/ContactUs';
import HelpCenter from './pages/HelpCenter';
import FAQ from './pages/FAQ';
import TournamentRules from './pages/TournamentRules';
import DiscordCallback from './pages/DiscordCallback';
import type { User, Team, Match, TeamInvitation } from './types/tournament';
import { 
  getTeams, 
  getMatches, 
  addTeam as addTeamFirebase, 
  updateMatch as updateMatchFirebase,
  updateMatchState as updateMatchStateFirebase,
  deleteTeam as deleteTeamFirebase,
  deleteAllTeams as deleteAllTeamsFirebase,
  deleteAllMatches as deleteAllMatchesFirebase,
  generateRandomTeams,
  generateFinalBracket,
  createTeamInvitation,
  getTeamInvitations,
  acceptTeamInvitation,
  declineTeamInvitation,
  updateTeamActivePlayers,
  registerTeamForTournament,
  getUserTeam,
  getUserMatches,
  getTeamPlayers,
  onUserTeamsChange,
  onTeamInvitationsChange,
  onNotificationsChange,
  onTeamPlayersChange
} from './services/firebaseService';
import { 
  onAuthStateChange, 
  registerUser, 
  loginUser, 
  logoutUser 
} from './services/authService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './config/firebase';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<User[]>([]);

  // Check if launch date has passed or if user is admin
  const isLaunched = () => {
    const launchDate = new Date('2025-06-21T15:00:00+02:00');
    const dateLaunched = new Date() >= launchDate;
    
    // If still loading, don't make any routing decisions
    // This prevents premature redirects during auth loading
    if (loading) {
      return dateLaunched; // Only use date check during loading
    }
    
    // Only check admin status if not loading and user is authenticated
    // and admin status has been determined (not null)
    const adminLaunched = currentUser && isAdmin === true;
    return dateLaunched || adminLaunched;
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, matchesData] = await Promise.all([
          getTeams(),
          getMatches()
        ]);
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadData();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load user data when user changes
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser || !currentUser.id) {
        setUserTeam(null);
        setTeamInvitations([]);
        setUserMatches([]);
        setTeamPlayers([]);
        // Only set isAdmin to false if we're not loading (i.e., user is actually null, not just loading)
        if (!loading) {
          setIsAdmin(false);
        }
        return;
      }

      try {
        const [userTeamData, invitationsData, matchesData] = await Promise.all([
          getUserTeam(currentUser.id),
          getTeamInvitations(currentUser.id),
          getUserMatches(currentUser.id)
        ]);

        setUserTeam(userTeamData);
        setTeamInvitations(invitationsData);
        setUserMatches(matchesData);

        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', currentUser.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setIsAdmin(userData.isAdmin || false);
        } else {
          setIsAdmin(false);
        }

        // Load team players if user has a team
        if (userTeamData) {
          const players = await getTeamPlayers(userTeamData.id);
          setTeamPlayers(players);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // Only set isAdmin to false on error if we're not loading
        if (!loading) {
          setIsAdmin(false);
        }
      }
    };

    loadUserData();
  }, [currentUser, loading]);

  // Real-time listeners
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribers = [
      onTeamInvitationsChange(currentUser.id, setTeamInvitations),
      onNotificationsChange(currentUser.id, () => {}), // Add notification handling if needed
    ];

    if (userTeam) {
      unsubscribers.push(onTeamPlayersChange(userTeam.id, setTeamPlayers));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser, userTeam]);

  const handleUserRegister = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    return await registerUser(userData);
  };

  const handleUserLogin = async (username: string, password: string) => {
    return await loginUser(username, password);
  };

  const handleUserLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
  };

  const handleCreateTeam = async (teamData: Omit<Team, 'id' | 'createdAt'>) => {
    const teamWithCreatedAt = { ...teamData, createdAt: new Date() };
    const teamId = await addTeamFirebase(teamWithCreatedAt);
    const newTeam = { ...teamWithCreatedAt, id: teamId };
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  };

  const handleInvitePlayer = async (teamId: string, username: string) => {
    if (!currentUser) return '';
    return await createTeamInvitation(teamId, username, currentUser.id);
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptTeamInvitation(invitationId);
    // Refresh user data
    if (currentUser) {
      const userTeamData = await getUserTeam(currentUser.id);
      setUserTeam(userTeamData);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    await declineTeamInvitation(invitationId);
    // Refresh invitations
    if (currentUser) {
      const invitationsData = await getTeamInvitations(currentUser.id);
      setTeamInvitations(invitationsData);
    }
  };

  const handleRegisterForTournament = async (teamId: string) => {
    await registerTeamForTournament(teamId);
  };

  const handleSetActivePlayers = async (teamId: string, activePlayers: string[]) => {
    await updateTeamActivePlayers(teamId, activePlayers);
    setTeamPlayers(activePlayers.map(player => ({ id: player } as User)));
  };

  const addTeam = async (team: Omit<Team, 'id'>) => {
    const teamId = await addTeamFirebase(team);
    const newTeam = { ...team, id: teamId };
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  };

  const updateMatch = async (matchId: string, result: { team1Score: number; team2Score: number }) => {
    await updateMatchFirebase(matchId, result);
    setMatches(prev => prev.map(match => 
      match.id === matchId 
        ? { ...match, ...result, isComplete: true }
        : match
    ));
  };

  const deleteTeam = async (teamId: string) => {
    await deleteTeamFirebase(teamId);
    setTeams(prev => prev.filter(team => team.id !== teamId));
  };

  const deleteAllTeams = async () => {
    await deleteAllTeamsFirebase();
    setTeams([]);
  };

  const deleteAllMatches = async () => {
    await deleteAllMatchesFirebase();
    setMatches([]);
  };

  const generateRandomTeamsForTesting = async (count: number) => {
    const newTeams = generateRandomTeams(count);
    const teamIds: string[] = [];
    
    for (const team of newTeams) {
      const teamId = await addTeamFirebase(team);
      teamIds.push(teamId);
      const newTeam = { ...team, id: teamId };
      setTeams(prev => [...prev, newTeam]);
    }
    
    return teamIds;
  };

  const generateFinalBracketForTesting = async () => {
    await generateFinalBracket(teams);
  };

  const handleTeamUpdate = () => {
    // This will trigger a re-render when team data changes
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono relative overflow-hidden flex items-center justify-center">
        {/* Subtle grid/code background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-10" style={{backgroundImage: 'repeating-linear-gradient(0deg, #fff1 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 40px)'}} />
        
        <div className="relative z-20">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar 
          currentUser={currentUser} 
          onLogout={handleUserLogout} 
          isAdmin={isAdmin || false}
        />
        <ConnectionStatus />
        <main className="flex-grow">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={isLaunched() ? <LandingPage /> : <CountdownPage />} />
            <Route path="/register" element={<UserRegistration onRegister={handleUserRegister} />} />
            <Route path="/login" element={<UserLogin onLogin={handleUserLogin} />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/gdpr" element={<GDPR />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/tournament-rules" element={<TournamentRules />} />
            <Route path="/discord/callback" element={<DiscordCallback />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              currentUser ? (
                <UserDashboard 
                  currentUser={currentUser}
                  userTeam={userTeam}
                  teamInvitations={teamInvitations}
                  userMatches={userMatches}
                  teamPlayers={teamPlayers}
                  onCreateTeam={handleCreateTeam}
                  onInvitePlayer={handleInvitePlayer}
                  onAcceptInvitation={handleAcceptInvitation}
                  onDeclineInvitation={handleDeclineInvitation}
                  onLogout={handleUserLogout}
                />
              ) : <Navigate to="/login" />
            } />
            <Route path="/profile" element={currentUser ? <Profile currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/team/register" element={
              currentUser ? (
                <TeamRegistration 
                  onRegister={handleCreateTeam}
                  teams={teams}
                />
              ) : <Navigate to="/login" />
            } />
            <Route path="/team/manage" element={currentUser ? <TeamManagement currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/team/create" element={currentUser ? <CreateTeam currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/match/:matchId" element={currentUser ? <MatchPage currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/tournaments" element={currentUser ? <TournamentList currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/tournaments/:id" element={currentUser ? <TournamentDetail currentUser={currentUser} /> : <Navigate to="/login" />} />
            <Route path="/tournament/:id" element={currentUser ? <TournamentDetail currentUser={currentUser} /> : <Navigate to="/login" />} />

            {/* Admin routes */}
            <Route path="/admin" element={
              isAdmin ? (
                <AdminPanel 
                  teams={teams}
                  matches={matches}
                  isAdmin={true}
                  onAddTeam={addTeam}
                  onUpdateMatch={updateMatch}
                  onDeleteTeam={deleteTeam}
                  onDeleteAllTeams={deleteAllTeams}
                  onDeleteAllMatches={deleteAllMatches}
                  onGenerateRandomTeams={generateRandomTeamsForTesting}
                  onGenerateFinalBracket={generateFinalBracketForTesting}
                />
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/tournaments" element={isAdmin ? <Navigate to="/admin/tournaments/manage" /> : <Navigate to="/" />} />
            <Route path="/admin/tournaments/create" element={isAdmin ? <TournamentCreation /> : <Navigate to="/" />} />
            <Route path="/admin/tournaments/manage" element={isAdmin ? <TournamentManagement /> : <Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
