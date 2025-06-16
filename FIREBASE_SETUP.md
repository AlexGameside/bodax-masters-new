# Firebase Setup Guide

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "bodax-masters")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Create an admin user:
   - Go to "Users" tab
   - Click "Add user"
   - Email: `admin@bodaxmasters.com`
   - Password: `bodax2025`

## 3. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users

## 4. Get Your Firebase Config

1. In your Firebase project, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "bodax-masters-web")
6. Copy the firebaseConfig object

## 5. Update Your Firebase Config

Replace the placeholder config in `src/config/firebase.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 6. Security Rules (Optional)

For production, you should set up proper Firestore security rules. Here's a basic example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to all users
    match /teams/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /matches/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Go to the admin panel: `/admin`
3. Login with password: `bodax2025`
4. Try generating random teams and brackets

## Features Added

- **Firebase Authentication**: Secure admin login
- **Firestore Database**: Persistent storage for teams and matches
- **Random Team Generation**: Generate test teams for bracket testing
- **Automatic Bracket Generation**: Create tournament brackets automatically
- **Updated Tournament Structure**: 4 teams advance to finals (not 8)
- **Modern UI**: Clean, professional styling

## Admin Panel Features

- **Teams Management**: View all registered teams
- **Matches Overview**: See all tournament matches
- **Tournament Tools**: Generate random teams and brackets
- **Data Export**: Download teams as CSV
- **Real-time Updates**: Data syncs with Firebase automatically 