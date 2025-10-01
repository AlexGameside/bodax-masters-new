import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Prediction, PredictionLeaderboardEntry, PredictionStats, Match, Team, User } from '../types/tournament';

export class PredictionService {
  
  // Create or update a prediction
  static async createOrUpdatePrediction(
    userId: string,
    matchId: string,
    tournamentId: string,
    predictedWinner: 'team1' | 'team2',
    predictedScore: { team1Score: number; team2Score: number }
  ): Promise<void> {
    try {
      // Check if prediction deadline has passed (1 hour before match)
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data() as Match;
      const scheduledTime = matchData.scheduledTime ? (matchData.scheduledTime instanceof Date ? matchData.scheduledTime : new Date(matchData.scheduledTime)) : null;
      const predictionDeadline = scheduledTime ? new Date(scheduledTime.getTime() - (60 * 60 * 1000)) : null; // 1 hour before
      const now = new Date();
      
      if (predictionDeadline && now >= predictionDeadline) {
        throw new Error('Prediction deadline has passed (1 hour before match)');
      }
      
      // Check if prediction already exists
      const predictionsRef = collection(db, 'predictions');
      const existingPredictionQuery = query(
        predictionsRef,
        where('userId', '==', userId),
        where('matchId', '==', matchId)
      );
      
      const existingPredictionSnapshot = await getDocs(existingPredictionQuery);
      
      if (existingPredictionSnapshot.empty) {
        // Create new prediction
        await addDoc(predictionsRef, {
          userId,
          matchId,
          tournamentId,
          predictedWinner,
          predictedScore,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Update existing prediction
        const predictionDoc = existingPredictionSnapshot.docs[0];
        await updateDoc(doc(db, 'predictions', predictionDoc.id), {
          predictedWinner,
          predictedScore,
          updatedAt: serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error('Error creating/updating prediction:', error);
      throw error;
    }
  }
  
  // Get user's prediction for a specific match
  static async getUserPrediction(userId: string, matchId: string): Promise<Prediction | null> {
    try {
      const predictionsRef = collection(db, 'predictions');
      const predictionQuery = query(
        predictionsRef,
        where('userId', '==', userId),
        where('matchId', '==', matchId)
      );
      
      const predictionSnapshot = await getDocs(predictionQuery);
      
      if (predictionSnapshot.empty) {
        return null;
      }
      
      const predictionDoc = predictionSnapshot.docs[0];
      const data = predictionDoc.data();
      
      return {
        id: predictionDoc.id,
        userId: data.userId,
        matchId: data.matchId,
        tournamentId: data.tournamentId,
        predictedWinner: data.predictedWinner,
        predictedScore: data.predictedScore,
        pointsAwarded: data.pointsAwarded,
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
      };
      
    } catch (error) {
      console.error('Error getting user prediction:', error);
      throw error;
    }
  }
  
  // Get all predictions for a user
  static async getUserPredictions(userId: string): Promise<Prediction[]> {
    try {
      const predictionsRef = collection(db, 'predictions');
      const predictionQuery = query(
        predictionsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const predictionSnapshot = await getDocs(predictionQuery);
      
      return predictionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          matchId: data.matchId,
          tournamentId: data.tournamentId,
          predictedWinner: data.predictedWinner,
          predictedScore: data.predictedScore,
          pointsAwarded: data.pointsAwarded,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
        };
      });
      
    } catch (error) {
      console.error('Error getting user predictions:', error);
      throw error;
    }
  }
  
  // Get predictions for a specific match
  static async getMatchPredictions(matchId: string): Promise<Prediction[]> {
    try {
      const predictionsRef = collection(db, 'predictions');
      const predictionQuery = query(
        predictionsRef,
        where('matchId', '==', matchId)
      );
      
      const predictionSnapshot = await getDocs(predictionQuery);
      
      return predictionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          matchId: data.matchId,
          tournamentId: data.tournamentId,
          predictedWinner: data.predictedWinner,
          predictedScore: data.predictedScore,
          pointsAwarded: data.pointsAwarded,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
        };
      });
      
    } catch (error) {
      console.error('Error getting match predictions:', error);
      throw error;
    }
  }
  
  // Calculate points for a prediction when match completes
  static calculatePredictionPoints(
    prediction: Prediction,
    actualWinner: 'team1' | 'team2',
    actualScore: { team1Score: number; team2Score: number }
  ): number {
    let points = 0;
    
    // 25 points for correct winner
    if (prediction.predictedWinner === actualWinner) {
      points += 25;
    }
    
    // 5 points for correct score
    if (prediction.predictedScore.team1Score === actualScore.team1Score &&
        prediction.predictedScore.team2Score === actualScore.team2Score) {
      points += 5;
    }
    
    return points;
  }
  
  // Award points for completed matches
  static async awardPointsForCompletedMatch(matchId: string): Promise<void> {
    try {
      // Get the match
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error('Match not found');
      }
      
      const matchData = matchDoc.data() as Match;
      
      if (!matchData.isComplete) {
        throw new Error('Match is not completed');
      }
      
      // Determine actual winner and score
      const actualWinner = matchData.team1Score > matchData.team2Score ? 'team1' : 'team2';
      const actualScore = {
        team1Score: matchData.team1Score,
        team2Score: matchData.team2Score
      };
      
      // Get all predictions for this match
      const predictions = await this.getMatchPredictions(matchId);
      
      // Update each prediction with points
      for (const prediction of predictions) {
        const points = this.calculatePredictionPoints(prediction, actualWinner, actualScore);
        
        await updateDoc(doc(db, 'predictions', prediction.id), {
          pointsAwarded: points,
          updatedAt: serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error('Error awarding points for completed match:', error);
      throw error;
    }
  }
  
  // Get leaderboard
  static async getLeaderboard(tournamentId?: string): Promise<PredictionLeaderboardEntry[]> {
    try {
      // Get all predictions
      const predictionsRef = collection(db, 'predictions');
      let predictionQuery = query(predictionsRef, orderBy('createdAt', 'desc'));
      
      if (tournamentId) {
        predictionQuery = query(
          predictionsRef,
          where('tournamentId', '==', tournamentId),
          orderBy('createdAt', 'desc')
        );
      }
      
      const predictionSnapshot = await getDocs(predictionQuery);
      const predictions = predictionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          matchId: data.matchId,
          tournamentId: data.tournamentId,
          predictedWinner: data.predictedWinner,
          predictedScore: data.predictedScore,
          pointsAwarded: data.pointsAwarded,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
        };
      });
      
      // Group by user and calculate stats
      const userStats = new Map<string, {
        totalPoints: number;
        correctPredictions: number;
        totalPredictions: number;
        recentPredictions: Prediction[];
      }>();
      
      for (const prediction of predictions) {
        if (!userStats.has(prediction.userId)) {
          userStats.set(prediction.userId, {
            totalPoints: 0,
            correctPredictions: 0,
            totalPredictions: 0,
            recentPredictions: []
          });
        }
        
        const stats = userStats.get(prediction.userId)!;
        stats.totalPredictions++;
        stats.totalPoints += prediction.pointsAwarded || 0;
        
        if (prediction.pointsAwarded && prediction.pointsAwarded > 0) {
          stats.correctPredictions++;
        }
        
        stats.recentPredictions.push(prediction);
      }
      
      // Get user data for usernames
      const leaderboard: PredictionLeaderboardEntry[] = [];
      
      for (const [userId, stats] of userStats) {
        // Get user data
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          
          leaderboard.push({
            userId,
            username: userData.username,
            totalPoints: stats.totalPoints,
            correctPredictions: stats.correctPredictions,
            totalPredictions: stats.totalPredictions,
            accuracy: stats.totalPredictions > 0 ? (stats.correctPredictions / stats.totalPredictions) * 100 : 0,
            recentPredictions: stats.recentPredictions.slice(0, 5) // Last 5 predictions
          });
        }
      }
      
      // Sort by total points
      return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
      
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }
  
  // Get user's prediction stats
  static async getUserPredictionStats(userId: string): Promise<PredictionStats> {
    try {
      const predictions = await this.getUserPredictions(userId);
      
      const stats: PredictionStats = {
        totalPredictions: predictions.length,
        correctWinnerPredictions: 0,
        correctScorePredictions: 0,
        totalPoints: 0,
        averagePointsPerMatch: 0
      };
      
      for (const prediction of predictions) {
        if (prediction.pointsAwarded) {
          stats.totalPoints += prediction.pointsAwarded;
          
          // Check if winner was correct (25 points)
          if (prediction.pointsAwarded >= 25) {
            stats.correctWinnerPredictions++;
          }
          
          // Check if score was correct (5 points)
          if (prediction.pointsAwarded >= 30) {
            stats.correctScorePredictions++;
          }
        }
      }
      
      stats.averagePointsPerMatch = stats.totalPredictions > 0 ? stats.totalPoints / stats.totalPredictions : 0;
      
      return stats;
      
    } catch (error) {
      console.error('Error getting user prediction stats:', error);
      throw error;
    }
  }
  
  // Check if user can still predict for a match
  static async canUserPredict(matchId: string): Promise<boolean> {
    try {
      const matchRef = doc(db, 'matches', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        return false;
      }
      
      const matchData = matchDoc.data() as Match;
      
      if (!matchData.scheduledTime) {
        return false;
      }
      
      const scheduledTime = matchData.scheduledTime ? (matchData.scheduledTime instanceof Date ? matchData.scheduledTime : new Date(matchData.scheduledTime)) : null;
      const predictionDeadline = scheduledTime ? new Date(scheduledTime.getTime() - (60 * 60 * 1000)) : null; // 1 hour before
      const now = new Date();
      
      return !predictionDeadline || now < predictionDeadline;
      
    } catch (error) {
      console.error('Error checking if user can predict:', error);
      return false;
    }
  }
}
