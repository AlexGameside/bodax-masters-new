# Bodax Masters - Valorant Tournament Platform

A modern, full-stack tournament management platform for Valorant competitions built with React, TypeScript, and Firebase.

## 🏆 Features

### Tournament Management
- **Tournament Creation & Management**: Create and manage tournaments with custom rules, prize pools, and formats
- **Team Registration**: Streamlined team registration with approval workflows
- **Bracket Generation**: Automatic single-elimination bracket generation
- **Match Management**: Real-time match tracking with score submission
- **Admin Controls**: Comprehensive admin panel for tournament oversight

### User Features
- **User Authentication**: Secure login/registration system
- **Team Management**: Create teams, invite players, manage roles
- **Real-time Notifications**: Live notification system for match updates, invitations, and results
- **Match Participation**: Join matches, submit results, and track progress
- **Profile Management**: User profiles with tournament history

### Technical Features
- **Real-time Updates**: Live data synchronization using Firebase
- **Responsive Design**: Mobile-friendly interface
- **TypeScript**: Full type safety throughout the application
- **Modern UI**: Clean, professional design with Tailwind CSS

## 🚀 Live Demo

Visit the live application: **[https://bodax-masters.web.app](https://bodax-masters.web.app)**

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **State Management**: React Hooks
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bodax-masters.git
   cd bodax-masters
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Firestore, and Hosting
   - Copy your Firebase config to `src/config/firebase.ts`

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable the following services:
   - Authentication (Email/Password)
   - Firestore Database
   - Hosting
3. Update the Firebase configuration in `src/config/firebase.ts`

### Environment Variables
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── services/           # Firebase and API services
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── hooks/              # Custom React hooks
└── utils/              # Utility functions
```

## 🎮 Usage

### For Tournament Organizers
1. **Create a Tournament**: Use the admin panel to create new tournaments
2. **Configure Settings**: Set up rules, prize pools, and registration requirements
3. **Manage Teams**: Approve team registrations and manage participants
4. **Monitor Matches**: Track match progress and handle disputes

### For Players
1. **Register**: Create an account and complete your profile
2. **Join/Create Team**: Create a team or accept invitations
3. **Register for Tournaments**: Sign up for available tournaments
4. **Participate**: Join matches and submit results

## 🔒 Security

- Firebase Authentication for user management
- Firestore security rules for data protection
- Input validation and sanitization
- Secure API endpoints

## 🚀 Deployment

The application is deployed on Firebase Hosting:

```bash
# Deploy to Firebase
firebase deploy --only hosting
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Valorant community for inspiration
- Firebase team for excellent documentation
- React and TypeScript communities for amazing tools

## 📞 Support

For support and questions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for the Valorant community**
