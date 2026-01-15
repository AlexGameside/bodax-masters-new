import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
import StreamingOverlay from './pages/StreamingOverlay';
import PlayoffStreamingOverlay from './pages/PlayoffStreamingOverlay';
import PlayoffOverlayTest from './pages/PlayoffOverlayTest';
import TournamentList from './pages/TournamentList';
import TournamentCreation from './pages/TournamentCreation';
import TournamentDetail from './pages/TournamentDetailV2';
import TournamentManagement from './pages/TournamentManagement';
import TicketManagement from './pages/TicketManagement';
import TicketNotificationManager from './components/TicketNotificationManager';
import UpcomingMatches from './pages/UpcomingMatches';

import BracketReveal from './pages/BracketReveal';
import TeamPage from './pages/TeamPage';
import MyMatches from './pages/MyMatches';
import ConnectionStatus from './components/ConnectionStatus';
// Footer pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import GDPR from './pages/GDPR';
import ContactUs from './pages/ContactUs';
import Impressum from './pages/Impressum';

import TournamentRules from './pages/TournamentRules';
import DiscordCallback from './pages/DiscordCallback';
import AdminStats from './pages/AdminStats';
import StreamOverlayManager from './pages/StreamOverlayManager';
import StreamerControl from './pages/StreamerControl';
import UnifiedOverlay from './pages/UnifiedOverlay';
import PredictionPage from './pages/PredictionPage';
import PredictionsPage from './pages/PredictionsPage';
import StreamerDashboard from './pages/StreamerDashboard';
import TournamentBracketPage from './pages/TournamentBracketPage';
import RiotApiTesting from './pages/RiotApiTesting';
import RiotMatchDetails from './pages/RiotMatchDetails';
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
  registerUser, 
  loginUser, 
  logoutUser 
} from './services/authService';

import { useAuth } from './hooks/useAuth';
import { getDoc, doc } from 'firebase/firestore';
import { db, auth } from './config/firebase';
import { toast } from 'react-hot-toast';

function App() {
  const { currentUser, loading, retryAuthStateCheck } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<User[]>([]);

  // Check if launch date has passed or if user is admin
  const isLaunched = () => {
    return true; // Always show landing page for Unity League tournament series
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamsData, matchesData] = await Promise.all([
          getTeams(currentUser?.id, currentUser?.isAdmin || false),
          getMatches()
        ]);
        setTeams(teamsData);
        setMatches(matchesData);
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Don't throw the error, just log it to prevent login failures
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);



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
        // Don't throw the error to prevent login failures
      }
    };

    loadUserData();
  }, [currentUser, loading]);

  // Add a fallback mechanism to retry auth state check if needed
  useEffect(() => {
    if (!loading && !currentUser) {
      // If we're not loading and there's no user, but Firebase auth might have a user
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {

        setTimeout(() => {
          retryAuthStateCheck();
        }, 500);
      }
    }
  }, [loading, currentUser, retryAuthStateCheck]);

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
  };

  const handleCreateTeam = async (teamData: Omit<Team, 'id' | 'createdAt'>) => {
    try {
      const teamWithCreatedAt = { ...teamData, createdAt: new Date() };
      const { createTeamWithLogging } = await import('./services/firebaseService');
      const newTeam = await createTeamWithLogging(teamWithCreatedAt);
      toast.success('Team created successfully!');
      return newTeam;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team');
      throw error;
    }
  };

  const handleInvitePlayer = async (teamId: string, username: string) => {
    try {
      // First, find the user by username (case-insensitive)
      const { getAllUsers } = await import('./services/firebaseService');
      const allUsers = await getAllUsers();
      const invitedUser = allUsers.find(user => 
        user.username.toLowerCase() === username.toLowerCase()
      );

      if (!invitedUser) {
        throw new Error('User not found');
      }

      const invitationId = await createTeamInvitation(teamId, invitedUser.id, currentUser!.id, '');
      toast.success(`Invitation sent to ${invitedUser.username}`);
      return invitationId;
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invitation');
      throw error;
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptTeamInvitation(invitationId);
    // Real-time listeners will automatically update the UI
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    await declineTeamInvitation(invitationId);
    // Real-time listeners will automatically update the UI
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] relative flex items-center justify-center">
        {/* Background Grid Pattern */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(30, 30, 30, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 30, 30, 0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative z-10 text-center">
          <div className="mb-6">
            <img 
              src="/bodax-pfp.png" 
              alt="Bodax Masters Logo" 
              className="w-24 h-24 mx-auto mb-4 rounded-full"
            />
          </div>
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-1 font-mono tracking-tight">BODAX MASTERS</h2>
          <p className="text-white/60 font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Overlay Routes - No Navbar/Footer */}
        <Route path="/stream/:matchId" element={<StreamingOverlay />} />
        <Route path="/playoff-stream/:matchId" element={<PlayoffStreamingOverlay />} />
        <Route path="/playoff-test" element={<PlayoffOverlayTest />} />
        <Route path="/overlay/:streamerId?" element={<UnifiedOverlay />} />
        <Route path="/predict/:matchId" element={<PredictionPage />} />
        <Route path="/tournaments/:id/bracket" element={<TournamentBracketPage currentUser={currentUser} />} />
        <Route path="/tournament/:id/bracket" element={<TournamentBracketPage currentUser={currentUser} />} />
        
        {/* All other routes with full layout */}
        <Route path="*" element={
          <AppContent 
            currentUser={currentUser}
            isAdmin={isAdmin}
            loading={loading}
            teams={teams}
            matches={matches}
            userTeam={userTeam}
            teamInvitations={teamInvitations}
            userMatches={userMatches}
            teamPlayers={teamPlayers}
            onUserRegister={handleUserRegister}
            onUserLogin={handleUserLogin}
            onUserLogout={handleUserLogout}
            onCreateTeam={handleCreateTeam}
            onInvitePlayer={handleInvitePlayer}
            onAcceptInvitation={handleAcceptInvitation}
            onDeclineInvitation={handleDeclineInvitation}
            onRegisterForTournament={handleRegisterForTournament}
            onSetActivePlayers={handleSetActivePlayers}
            addTeam={addTeam}
            updateMatch={updateMatch}
            deleteTeam={deleteTeam}
            deleteAllTeams={deleteAllTeams}
            deleteAllMatches={deleteAllMatches}
            generateRandomTeamsForTesting={generateRandomTeamsForTesting}
            generateFinalBracketForTesting={generateFinalBracketForTesting}
          />
        } />
      </Routes>
    </Router>
  );
}

// Separate component to use useLocation hook
function AppContent({
  currentUser,
  isAdmin,
  loading,
  teams,
  matches,
  userTeam,
  teamInvitations,
  userMatches,
  teamPlayers,
  onUserRegister,
  onUserLogin,
  onUserLogout,
  onCreateTeam,
  onInvitePlayer,
  onAcceptInvitation,
  onDeclineInvitation,
  onRegisterForTournament,
  onSetActivePlayers,
  addTeam,
  updateMatch,
  deleteTeam,
  deleteAllTeams,
  deleteAllMatches,
  generateRandomTeamsForTesting,
  generateFinalBracketForTesting
}: {
  currentUser: any;
  isAdmin: boolean | null;
  loading: boolean;
  teams: any[];
  matches: any[];
  userTeam: any;
  teamInvitations: any[];
  userMatches: any[];
  teamPlayers: any[];
  onUserRegister: any;
  onUserLogin: any;
  onUserLogout: any;
  onCreateTeam: any;
  onInvitePlayer: any;
  onAcceptInvitation: any;
  onDeclineInvitation: any;
  onRegisterForTournament: any;
  onSetActivePlayers: any;
  addTeam: any;
  updateMatch: any;
  deleteTeam: any;
  deleteAllTeams: any;
  deleteAllMatches: any;
  generateRandomTeamsForTesting: any;
  generateFinalBracketForTesting: any;
}) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Show navbar for all pages */}
      <Navbar 
        currentUser={currentUser} 
        onLogout={onUserLogout} 
        isAdmin={isAdmin || false}
      />
      <ConnectionStatus />
      
      {/* Ticket Notifications */}
      {currentUser && <TicketNotificationManager currentUser={currentUser} />}
      
      <main className="flex-grow">
        <Routes>
          {/* Public routes - always accessible */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/register" element={<UserRegistration onRegister={onUserRegister} />} />
          <Route path="/login" element={<UserLogin onLogin={onUserLogin} />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/gdpr" element={<GDPR />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/discord/callback" element={<DiscordCallback />} />
          <Route path="/discord-callback" element={<DiscordCallback />} />

          {/* User routes - require authentication */}
          <Route path="/profile" element={currentUser ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/team/register" element={
            currentUser ? (
              <TeamRegistration 
                onRegister={onCreateTeam}
                teams={teams}
              />
            ) : <Navigate to="/login" />
          } />
          <Route path="/team-management" element={currentUser ? <TeamManagement currentUser={currentUser} /> : <Navigate to="/login" />} />
          <Route path="/create-team" element={currentUser ? <CreateTeam currentUser={currentUser} /> : <Navigate to="/login" />} />
          <Route path="/teams/:teamId" element={<TeamPage />} />

          {/* Tournament routes - accessible to everyone */}
          <Route path="/tournaments" element={<TournamentList currentUser={currentUser} />} />
          <Route path="/upcoming-matches" element={<UpcomingMatches currentUser={currentUser} />} />
          <Route path="/predictions" element={<PredictionsPage currentUser={currentUser} />} />
          <Route path="/tournaments/:id" element={<TournamentDetail currentUser={currentUser} />} />
          <Route path="/tournament/:id" element={<TournamentDetail currentUser={currentUser} />} />
          <Route path="/tournament-rules" element={<TournamentRules />} />
          <Route path="/match/:matchId" element={currentUser ? <MatchPage /> : <Navigate to="/login" />} />
          <Route path="/my-matches" element={<MyMatches />} />
          <Route path="/dashboard" element={
            <UserDashboard 
              currentUser={currentUser}
              userTeam={userTeam}
              teamInvitations={teamInvitations}
              teamPlayers={teamPlayers}
              teams={teams}
              onCreateTeam={onCreateTeam}
              onInvitePlayer={async (teamId: string, username: string) => {
                // Find user by username and create invitation
                const user = teams.find(t => t.name === username)?.members[0]?.userId;
                if (user) {
                  return await createTeamInvitation(teamId, user, currentUser?.id || '');
                }
                throw new Error('User not found');
              }}
              onAcceptInvitation={acceptTeamInvitation}
              onDeclineInvitation={declineTeamInvitation}
              onLogout={onUserLogout}
            />
          } />
          <Route path="/tickets" element={currentUser ? <TicketManagement /> : <Navigate to="/login" />} />

          {/* Admin routes - require admin privileges */}
          <Route path="/admin" element={isAdmin === true ? <Navigate to="/admin/users" replace /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          <Route path="/admin/:tab" element={
            isAdmin === true ? (
              <AdminPanel 
                teams={teams}
                matches={matches}
                isAdmin={true}
                currentUser={currentUser}
                onAddTeam={addTeam}
                onUpdateMatch={updateMatch}
                onDeleteTeam={deleteTeam}
                onDeleteAllTeams={deleteAllTeams}
                onDeleteAllMatches={deleteAllMatches}
                onGenerateRandomTeams={generateRandomTeamsForTesting}
                onGenerateFinalBracket={generateFinalBracketForTesting}
              />
            ) : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>
          } />
          <Route path="/admin/tournaments" element={
            isAdmin === true ? (
              <AdminPanel 
                teams={teams}
                matches={matches}
                isAdmin={true}
                currentUser={currentUser}
                onAddTeam={addTeam}
                onUpdateMatch={updateMatch}
                onDeleteTeam={deleteTeam}
                onDeleteAllTeams={deleteAllTeams}
                onDeleteAllMatches={deleteAllMatches}
                onGenerateRandomTeams={generateRandomTeamsForTesting}
                onGenerateFinalBracket={generateFinalBracketForTesting}
                forceTab="tournaments"
              />
            ) : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>
          } />
          <Route path="/admin/tournaments/create" element={isAdmin === true ? <TournamentCreation /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          <Route path="/admin/tournaments/manage" element={isAdmin === true ? <TournamentManagement /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />

          {/* Back-compat: old create tournament URL -> admin scoped route */}
          <Route
            path="/tournaments/create"
            element={
              isAdmin === true ? (
                <Navigate to="/admin/tournaments/create" replace />
              ) : isAdmin === false ? (
                <Navigate to="/" replace />
              ) : (
                <div>Loading...</div>
              )
            }
          />
          <Route path="/admin/bracket-reveal/:id" element={isAdmin === true ? <BracketReveal currentUser={currentUser} /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          <Route path="/admin/stats" element={isAdmin === true ? <AdminStats /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          <Route path="/admin/stream-overlays" element={isAdmin === true ? <StreamOverlayManager /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          <Route path="/admin/riot-api-testing" element={isAdmin === true ? <RiotApiTesting /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          <Route path="/admin/riot-api-testing/match/:matchId" element={isAdmin === true ? <RiotMatchDetails /> : isAdmin === false ? <Navigate to="/" /> : <div>Loading...</div>} />
          
          {/* Streamer Control Dashboard */}
          <Route path="/streamer-control/:streamerId?" element={<StreamerControl />} />
          
          {/* Streamer Dashboard - requires authentication */}
          <Route path="/streamer/:streamerId" element={currentUser ? <StreamerDashboard /> : <Navigate to="/login" />} />
          
          {/* Catch all other routes and redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
