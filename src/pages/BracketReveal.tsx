import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  Volume2,
  VolumeX,
  Zap,
  Crown,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertTriangle,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Fullscreen,
  Users,
  Swords
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

interface BracketRevealProps {
  currentUser: any;
}

// Sample bracket structure - just matchups, no results
const bracketStructure = {
  round1: [
    { id: 'r1-1', team1: 'Team Alpha', team2: 'Team Beta', revealed: false },
    { id: 'r1-2', team1: 'Team Gamma', team2: 'Team Delta', revealed: false },
    { id: 'r1-3', team1: 'Team Echo', team2: 'Team Foxtrot', revealed: false },
    { id: 'r1-4', team1: 'Team Golf', team2: 'Team Hotel', revealed: false },
    { id: 'r1-5', team1: 'Team India', team2: 'Team Juliet', revealed: false },
    { id: 'r1-6', team1: 'Team Kilo', team2: 'Team Lima', revealed: false },
    { id: 'r1-7', team1: 'Team Mike', team2: 'Team November', revealed: false },
    { id: 'r1-8', team1: 'Team Oscar', team2: 'Team Papa', revealed: false }
  ],
  round2: [
    { id: 'r2-1', team1: 'TBD', team2: 'TBD', revealed: false },
    { id: 'r2-2', team1: 'TBD', team2: 'TBD', revealed: false },
    { id: 'r2-3', team1: 'TBD', team2: 'TBD', revealed: false },
    { id: 'r2-4', team1: 'TBD', team2: 'TBD', revealed: false }
  ],
  round3: [
    { id: 'r3-1', team1: 'TBD', team2: 'TBD', revealed: false },
    { id: 'r3-2', team1: 'TBD', team2: 'TBD', revealed: false }
  ],
  final: [
    { id: 'final', team1: 'TBD', team2: 'TBD', revealed: false }
  ]
};

const BracketReveal: React.FC<BracketRevealProps> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser: authUser } = useAuth();
  
  // State
  const [bracket, setBracket] = useState(bracketStructure);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoReveal, setAutoReveal] = useState(false);
  const [revealDelay, setRevealDelay] = useState(3000);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if user is admin
  const isAdmin = currentUser?.isAdmin === true || authUser?.isAdmin === true;

  useEffect(() => {
    if (!isAdmin) {
      navigate('/tournaments');
      return;
    }
  }, [isAdmin, navigate]);

  // Get all matches in reveal order
  const getAllMatches = () => {
    const matches: Array<{
      id: string;
      team1: string;
      team2: string;
      revealed: boolean;
      round: number;
      type: 'round1' | 'round2' | 'round3' | 'final';
    }> = [];
    
    // Round 1 matches first
    bracket.round1.forEach(match => {
      matches.push({ ...match, round: 1, type: 'round1' });
    });
    
    // Then round 2
    bracket.round2.forEach(match => {
      matches.push({ ...match, round: 2, type: 'round2' });
    });
    
    // Then round 3
    bracket.round3.forEach(match => {
      matches.push({ ...match, round: 3, type: 'round3' });
    });
    
    // Then final
    bracket.final.forEach(match => {
      matches.push({ ...match, round: 4, type: 'final' });
    });
    
    return matches;
  };

  const allMatches = getAllMatches();

  useEffect(() => {
    if (autoReveal && !isPaused && currentRevealIndex < allMatches.length) {
      const timer = setTimeout(() => {
        revealNextMatch();
      }, revealDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoReveal, isPaused, currentRevealIndex, revealDelay, allMatches.length]);

  const revealNextMatch = () => {
    if (currentRevealIndex >= allMatches.length) return;
    
    setIsRevealing(true);
    
    // Play reveal sound (if audio file exists)
    if (audioRef.current && !muted) {
      audioRef.current.currentTime = 0;

    }
    
    setTimeout(() => {
      const match = allMatches[currentRevealIndex];
      
      // Update the bracket state to reveal this match
      setBracket(prevBracket => {
        const newBracket = { ...prevBracket };
        
        if (match.type === 'round1') {
          newBracket.round1 = newBracket.round1.map(m => 
            m.id === match.id ? { ...m, revealed: true } : m
          );
        } else if (match.type === 'round2') {
          newBracket.round2 = newBracket.round2.map(m => 
            m.id === match.id ? { ...m, revealed: true } : m
          );
        } else if (match.type === 'round3') {
          newBracket.round3 = newBracket.round3.map(m => 
            m.id === match.id ? { ...m, revealed: true } : m
          );
        } else if (match.type === 'final') {
          newBracket.final = newBracket.final.map(m => 
            m.id === match.id ? { ...m, revealed: true } : m
          );
        }
        
        return newBracket;
      });
      
      setCurrentRevealIndex(prev => prev + 1);
      setIsRevealing(false);
      
      if (currentRevealIndex + 1 >= allMatches.length) {
        setAutoReveal(false);
        toast.success('Tournament bracket fully revealed!');
      }
    }, 1500);
  };

  const revealPreviousMatch = () => {
    if (currentRevealIndex <= 0) return;
    
    const newIndex = currentRevealIndex - 1;
    const match = allMatches[newIndex];
    
    // Update the bracket state to hide this match
    setBracket(prevBracket => {
      const newBracket = { ...prevBracket };
      
      if (match.type === 'round1') {
        newBracket.round1 = newBracket.round1.map(m => 
          m.id === match.id ? { ...m, revealed: false } : m
        );
      } else if (match.type === 'round2') {
        newBracket.round2 = newBracket.round2.map(m => 
          m.id === match.id ? { ...m, revealed: false } : m
        );
      } else if (match.type === 'round3') {
        newBracket.round3 = newBracket.round3.map(m => 
          m.id === match.id ? { ...m, revealed: false } : m
        );
      } else if (match.type === 'final') {
        newBracket.final = newBracket.final.map(m => 
          m.id === match.id ? { ...m, revealed: false } : m
        );
      }
      
      return newBracket;
    });
    
    setCurrentRevealIndex(newIndex);
  };

  const resetReveal = () => {
    setBracket(bracketStructure);
    setCurrentRevealIndex(0);
    setIsRevealing(false);
    setAutoReveal(false);
  };

  const toggleAutoReveal = () => {
    setAutoReveal(!autoReveal);
    if (!autoReveal && currentRevealIndex >= allMatches.length) {
      resetReveal();
    }
  };

  const togglePause = () => setIsPaused(!isPaused);
  const toggleMute = () => setMuted(!muted);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getRoundName = (round: number) => {
    if (round === 1) return 'Round 1';
    if (round === 2) return 'Quarter Finals';
    if (round === 3) return 'Semi Finals';
    if (round === 4) return 'Finals';
    return `Round ${round}`;
  };

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400">Only admins can access the bracket reveal page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-blue-900/20"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)'
      }}></div>
      
      {/* Audio Element */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/reveal.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/tournaments/${id}`)}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
              Tournament Bracket Reveal
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {showControls ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="relative z-10 px-6 pb-4">
          <div className="bg-black/60 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={revealNextMatch}
                  disabled={isRevealing || currentRevealIndex >= allMatches.length}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Reveal Next</span>
                </button>
                
                <button
                  onClick={revealPreviousMatch}
                  disabled={currentRevealIndex <= 0}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                
                <button
                  onClick={toggleAutoReveal}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    autoReveal ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>{autoReveal ? 'Auto On' : 'Auto Off'}</span>
                </button>
                
                <button
                  onClick={togglePause}
                  disabled={!autoReveal}
                  className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                
                <button
                  onClick={resetReveal}
                  className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Delay:</span>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={revealDelay}
                    onChange={(e) => setRevealDelay(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-400">{(revealDelay / 1000).toFixed(1)}s</span>
                </div>
                
                <div className="text-sm text-gray-400">
                  {currentRevealIndex} / {allMatches.length} matchups revealed
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Bracket */}
      <div className="relative z-10 px-6 pb-6 overflow-x-auto">
        <div className="flex space-x-8 min-w-max">
          {/* Round 1 */}
          <div className="flex flex-col space-y-6">
            <h3 className="text-lg font-bold text-center text-blue-400">
              {getRoundName(1)}
            </h3>
            <div className="flex flex-col space-y-4">
              {bracket.round1.map((match, index) => (
                <div
                  key={match.id}
                  className={`relative bg-black/40 backdrop-blur-sm border rounded-lg p-4 transition-all duration-500 ${
                    match.revealed 
                      ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
                      : 'border-gray-700/50'
                  } ${
                    currentRevealIndex < allMatches.length && 
                    allMatches[currentRevealIndex].id === match.id && 
                    isRevealing
                      ? 'scale-105 border-yellow-500 shadow-lg shadow-yellow-500/50' 
                      : ''
                  }`}
                >
                  {/* Reveal Animation Overlay */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-blue-500/20 rounded-lg animate-pulse z-10"></div>
                  )}
                  
                  <div className="relative z-20">
                    {match.revealed ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="font-medium">{match.team1}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <Swords className="w-5 h-5 text-yellow-500" />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-red-400" />
                            <span className="font-medium">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-6 h-6 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-500">Hidden</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reveal Animation */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <div className="text-center">
                        <div className="animate-bounce">
                          <Sparkles className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                        </div>
                        <div className="text-yellow-500 font-bold animate-pulse text-xs">
                          REVEALING...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Round 2 */}
          <div className="flex flex-col space-y-6">
            <h3 className="text-lg font-bold text-center text-green-400">
              {getRoundName(2)}
            </h3>
            <div className="flex flex-col space-y-8">
              {bracket.round2.map((match, index) => (
                <div
                  key={match.id}
                  className={`relative bg-black/40 backdrop-blur-sm border rounded-lg p-4 transition-all duration-500 ${
                    match.revealed 
                      ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
                      : 'border-gray-700/50'
                  } ${
                    currentRevealIndex < allMatches.length && 
                    allMatches[currentRevealIndex].id === match.id && 
                    isRevealing
                      ? 'scale-105 border-yellow-500 shadow-lg shadow-yellow-500/50' 
                      : ''
                  }`}
                >
                  {/* Reveal Animation Overlay */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-blue-500/20 rounded-lg animate-pulse z-10"></div>
                  )}
                  
                  <div className="relative z-20">
                    {match.revealed ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="font-medium">{match.team1}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <Swords className="w-5 h-5 text-yellow-500" />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-red-400" />
                            <span className="font-medium">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-6 h-6 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-500">Hidden</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reveal Animation */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <div className="text-center">
                        <div className="animate-bounce">
                          <Sparkles className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                        </div>
                        <div className="text-yellow-500 font-bold animate-pulse text-xs">
                          REVEALING...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Round 3 */}
          <div className="flex flex-col space-y-6">
            <h3 className="text-lg font-bold text-center text-purple-400">
              {getRoundName(3)}
            </h3>
            <div className="flex flex-col space-y-12">
              {bracket.round3.map((match, index) => (
                <div
                  key={match.id}
                  className={`relative bg-black/40 backdrop-blur-sm border rounded-lg p-4 transition-all duration-500 ${
                    match.revealed 
                      ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
                      : 'border-gray-700/50'
                  } ${
                    currentRevealIndex < allMatches.length && 
                    allMatches[currentRevealIndex].id === match.id && 
                    isRevealing
                      ? 'scale-105 border-yellow-500 shadow-lg shadow-yellow-500/50' 
                      : ''
                  }`}
                >
                  {/* Reveal Animation Overlay */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-blue-500/20 rounded-lg animate-pulse z-10"></div>
                  )}
                  
                  <div className="relative z-20">
                    {match.revealed ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="font-medium">{match.team1}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <Swords className="w-5 h-5 text-yellow-500" />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-red-400" />
                            <span className="font-medium">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Eye className="w-6 h-6 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-500">Hidden</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reveal Animation */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <div className="text-center">
                        <div className="animate-bounce">
                          <Sparkles className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                        </div>
                        <div className="text-yellow-500 font-bold animate-pulse text-xs">
                          REVEALING...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Finals */}
          <div className="flex flex-col space-y-6">
            <h3 className="text-lg font-bold text-center text-yellow-400">
              {getRoundName(4)}
            </h3>
            <div className="flex flex-col space-y-4">
              {bracket.final.map((match, index) => (
                <div
                  key={match.id}
                  className={`relative bg-black/40 backdrop-blur-sm border rounded-lg p-4 transition-all duration-500 ${
                    match.revealed 
                      ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
                      : 'border-gray-700/50'
                  } ${
                    currentRevealIndex < allMatches.length && 
                    allMatches[currentRevealIndex].id === match.id && 
                    isRevealing
                      ? 'scale-105 border-yellow-500 shadow-lg shadow-yellow-500/50' 
                      : ''
                  }`}
                >
                  {/* Reveal Animation Overlay */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-blue-500/20 rounded-lg animate-pulse z-10"></div>
                  )}
                  
                  <div className="relative z-20">
                    {match.revealed ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="font-medium">{match.team1}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center">
                          <Swords className="w-5 h-5 text-yellow-500" />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="font-medium">{match.team2}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-20">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Trophy className="w-6 h-6 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-500">Finals</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Reveal Animation */}
                  {currentRevealIndex < allMatches.length && 
                   allMatches[currentRevealIndex].id === match.id && 
                   isRevealing && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <div className="text-center">
                        <div className="animate-bounce">
                          <Sparkles className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        </div>
                        <div className="text-yellow-500 font-bold animate-pulse">
                          FINALS!
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-2 bg-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-blue-500 transition-all duration-300"
          style={{ width: `${(currentRevealIndex / allMatches.length) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default BracketReveal; 