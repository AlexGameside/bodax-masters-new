# Prediction Feature

## Overview
The prediction feature allows users to predict match outcomes and compete on a leaderboard. Users can predict both the winner and the exact score of upcoming matches.

## Features

### Prediction System
- **Prediction Window**: Users can predict until 1 hour before the match starts
- **Prediction Types**: Users predict both the winner and exact score (e.g., 2-1)
- **Scoring System**:
  - Correct Winner: 25 points
  - Correct Score: 5 points
  - Maximum points per match: 30 points

### User Experience
- **One Prediction Per Match**: Each user can make one prediction per match
- **Editable Predictions**: Users can change their predictions until the deadline
- **Prediction History**: Available in user profile
- **Real-time Updates**: Leaderboard updates automatically when matches complete

### Leaderboard
- **Filterable**: View all-time or current tournament leaderboard
- **Comprehensive Stats**: Shows total points, accuracy percentage, and prediction count
- **Real-time Rankings**: Updates automatically as matches complete

## Technical Implementation

### Data Model
- **Predictions Collection**: Stores user predictions with match and tournament references
- **Scoring Logic**: Automatically calculates points when matches complete
- **Integration**: Seamlessly integrated with existing match completion flow

### Files Created/Modified
- `src/types/tournament.ts` - Added prediction interfaces
- `src/services/predictionService.ts` - Core prediction logic and CRUD operations
- `src/pages/PredictionsPage.tsx` - Main prediction interface
- `src/components/Navbar.tsx` - Added prediction tab
- `src/App.tsx` - Added prediction routes
- `src/services/firebaseService.ts` - Integrated prediction points awarding

### Database Collections
- **predictions**: Stores user predictions
  - Fields: userId, matchId, tournamentId, predictedWinner, predictedScore, pointsAwarded, timestamps

## Usage

### For Users
1. Navigate to the "Predictions" tab in the navbar
2. View upcoming matches available for prediction
3. Select winner and enter predicted score
4. Submit or update predictions until 1 hour before match
5. View leaderboard to see rankings

### For Admins
- Predictions are automatically processed when matches complete
- No additional admin action required
- Points are awarded based on actual match results

## Scoring Examples
- User predicts Team A wins 2-1, actual result is Team A wins 2-1: **30 points** (25 + 5)
- User predicts Team A wins 2-1, actual result is Team A wins 2-0: **25 points** (winner only)
- User predicts Team A wins 2-1, actual result is Team B wins 2-1: **0 points**

## Future Enhancements
- Tournament-specific leaderboards
- Prediction streaks and achievements
- Social features (sharing predictions)
- Advanced statistics and analytics




