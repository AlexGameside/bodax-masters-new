import React from 'react';
import { CheckCircle, Clock, Gamepad2, Trophy, MapPin, Users } from 'lucide-react';
import type { Match } from '../types/tournament';

interface MatchProgressBarProps {
  match: Match;
  isTeam1: boolean;
  isTeam2: boolean;
  isAdmin?: boolean;
}

const MatchProgressBar: React.FC<MatchProgressBarProps> = ({ match, isTeam1, isTeam2, isAdmin = false }) => {
  const getCurrentStage = () => {
    switch (match.matchState) {
      case 'ready_up':
        return 1;
      case 'map_banning':
        return 2;
      case 'side_selection':
        return 3;
      case 'playing':
        return 4;
      case 'waiting_results':
      case 'disputed':
      case 'completed':
        return 5;
      default:
        return 1;
    }
  };

  const currentStage = getCurrentStage();
  const totalStages = 5;

  const stages = [
    {
      id: 1,
      name: 'Ready Up',
      icon: Users,
      description: 'Teams confirm they are ready to play',
      completed: match.team1Ready && match.team2Ready,
      current: match.matchState === 'ready_up'
    },
    {
      id: 2,
      name: 'Map Ban',
      icon: MapPin,
      description: 'Teams ban and select maps',
      completed: match.matchState !== 'ready_up' && match.matchState !== 'map_banning',
      current: match.matchState === 'map_banning'
    },
    {
      id: 3,
      name: 'Side Selection',
      icon: Gamepad2,
      description: 'Teams choose attack/defense sides',
      completed: match.matchState !== 'ready_up' && match.matchState !== 'map_banning' && match.matchState !== 'side_selection',
      current: match.matchState === 'side_selection'
    },
    {
      id: 4,
      name: 'Playing',
      icon: Gamepad2,
      description: 'Match in progress',
      completed: match.matchState === 'completed' || match.matchState === 'waiting_results' || match.matchState === 'disputed',
      current: match.matchState === 'playing'
    },
    {
      id: 5,
      name: 'Result',
      icon: Trophy,
      description: 'Match completed',
      completed: match.matchState === 'completed',
      current: match.matchState === 'waiting_results' || match.matchState === 'disputed' || match.matchState === 'completed'
    }
  ];

  const getStageStatus = (stage: typeof stages[0]) => {
    if (stage.completed) return 'completed';
    if (stage.current) return 'current';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-white';
      case 'current':
        return 'bg-blue-500 border-blue-500 text-white';
      default:
        return 'bg-gray-600 border-gray-600 text-gray-300';
    }
  };

  const getProgressPercentage = () => {
    return (currentStage / totalStages) * 100;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Match Progress</h3>
        <div className="text-sm text-gray-400">
          Stage {currentStage} of {totalStages}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const Icon = stage.icon;
          
          return (
            <div key={stage.id} className="text-center">
              <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${getStatusColor(status)}`}>
                {status === 'completed' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Icon className="w-6 h-6" />
                )}
                {status === 'current' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="mt-2">
                <div className={`text-sm font-medium ${status === 'completed' ? 'text-green-400' : status === 'current' ? 'text-blue-400' : 'text-gray-400'}`}>
                  {stage.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {stage.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Stage Info */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-white font-medium">
              Current Stage: {stages[currentStage - 1]?.name}
            </h4>
            <p className="text-gray-300 text-sm mt-1">
              {stages[currentStage - 1]?.description}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">
              {match.matchState === 'ready_up' && (
                <div>
                  <div className={match.team1Ready ? 'text-green-400' : 'text-gray-400'}>
                    Team 1: {match.team1Ready ? 'Ready' : 'Not Ready'}
                  </div>
                  <div className={match.team2Ready ? 'text-green-400' : 'text-gray-400'}>
                    Team 2: {match.team2Ready ? 'Ready' : 'Not Ready'}
                  </div>
                </div>
              )}
              {match.matchState === 'map_banning' && (
                <div className="text-blue-400">
                  Map Selection Phase
                </div>
              )}
              {match.matchState === 'side_selection' && (
                <div className="text-blue-400">
                  Side Selection Phase
                </div>
              )}
              {match.matchState === 'playing' && (
                <div className="text-green-400">
                  Match in Progress
                </div>
              )}
              {match.matchState === 'completed' && (
                <div className="text-green-400">
                  Match Completed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchProgressBar; 