import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types/tournament';
import { getUserById, getUserByEmail, getUserByUsername } from './firebaseService';

// Store the current user in memory
let currentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

const RIOT_USER_ID_KEY = 'riot_user_id';

export const notifyAuthStateListeners = (user: User | null) => {
  currentUser = user;
  authStateListeners.forEach(listener => listener(user));
};

// Sign in with Riot (stores user ID in localStorage)
export const signInWithRiot = async (userId: string): Promise<void> => {
  try {
    // Store user ID in localStorage
    localStorage.setItem(RIOT_USER_ID_KEY, userId);
    
    // Fetch user data from Firestore
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    notifyAuthStateListeners(user);
  } catch (error) {
    console.error('Error signing in with Riot:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    // Sign out from Firebase Auth
    await signOut(auth);
    localStorage.removeItem(RIOT_USER_ID_KEY);
    notifyAuthStateListeners(null);
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local state even if Firebase signout fails
    localStorage.removeItem(RIOT_USER_ID_KEY);
    notifyAuthStateListeners(null);
    throw error;
  }
};

// Check if user is logged in (from localStorage)
export const getStoredUserId = (): string | null => {
  return localStorage.getItem(RIOT_USER_ID_KEY);
};

// Initialize auth state from Firebase Auth or localStorage
export const initializeAuth = async (): Promise<User | null> => {
  try {
    // First, check Firebase Auth state
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        unsubscribe();
        
        if (firebaseUser) {
          try {
            const user = await getUserById(firebaseUser.uid);
            if (user) {
              localStorage.setItem(RIOT_USER_ID_KEY, firebaseUser.uid);
              notifyAuthStateListeners(user);
              resolve(user);
              return;
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }
        }
        
        // Fallback to localStorage (for Riot users)
        const userId = getStoredUserId();
        if (userId) {
          try {
            const user = await getUserById(userId);
            if (user) {
              notifyAuthStateListeners(user);
              resolve(user);
              return;
            }
          } catch (error) {
            console.error('Error fetching user from localStorage:', error);
          }
        }
        
        // No user found
        localStorage.removeItem(RIOT_USER_ID_KEY);
        notifyAuthStateListeners(null);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Error initializing auth:', error);
    localStorage.removeItem(RIOT_USER_ID_KEY);
    notifyAuthStateListeners(null);
    return null;
  }
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  authStateListeners.push(callback);
  
  // Immediately call with current user
  callback(currentUser);
  
  // Also listen to Firebase Auth state changes
  const unsubscribeFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        const user = await getUserById(firebaseUser.uid);
        if (user) {
          localStorage.setItem(RIOT_USER_ID_KEY, firebaseUser.uid);
          notifyAuthStateListeners(user);
        } else {
          localStorage.removeItem(RIOT_USER_ID_KEY);
          notifyAuthStateListeners(null);
        }
      } catch (error) {
        console.error('Error fetching user on auth state change:', error);
        localStorage.removeItem(RIOT_USER_ID_KEY);
        notifyAuthStateListeners(null);
      }
    } else {
      // User signed out
      const storedUserId = getStoredUserId();
      if (storedUserId) {
        // Check if it's a Riot user (not Firebase Auth)
        try {
          const user = await getUserById(storedUserId);
          if (user && !user.uid) {
            // Riot user, keep them logged in
            return;
          }
        } catch (error) {
          // Ignore
        }
      }
      localStorage.removeItem(RIOT_USER_ID_KEY);
      notifyAuthStateListeners(null);
    }
  });
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
    unsubscribeFirebase();
  };
};

// Get current user
export const getCurrentUser = (): User | null => {
  return currentUser;
};

// Email/Password Registration
export const registerUser = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }): Promise<void> => {
  try {
    // Check if username already exists
    const existingUserByUsername = await getUserByUsername(userData.username);
    if (existingUserByUsername) {
      throw new Error('USERNAME_EXISTS');
    }

    // Check if email already exists
    const existingUserByEmail = await getUserByEmail(userData.email);
    if (existingUserByEmail) {
      throw new Error('EMAIL_EXISTS');
    }

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    const firebaseUser = userCredential.user;

    // Create user document in Firestore
    const userDoc: Omit<User, 'id'> = {
      username: userData.username,
      email: userData.email,
      riotId: userData.riotId || '',
      discordUsername: userData.discordUsername || '',
      teamIds: [],
      isAdmin: false,
      createdAt: new Date(),
      uid: firebaseUser.uid,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userDoc,
      createdAt: serverTimestamp(),
    });

    // Also create public user document
    await setDoc(doc(db, 'public_users', firebaseUser.uid), {
      id: firebaseUser.uid,
      username: userData.username,
      riotId: userData.riotId || '',
      discordUsername: userData.discordUsername || '',
      teamIds: [],
      isAdmin: false,
      createdAt: serverTimestamp(),
    });

    // Create user lookup document for login purposes (allows username -> email lookup)
    await addDoc(collection(db, 'user_lookups'), {
      userId: firebaseUser.uid,
      username: userData.username,
      email: userData.email,
      createdAt: serverTimestamp(),
    });

    // Fetch and notify listeners
    const user = await getUserById(firebaseUser.uid);
    if (user) {
      notifyAuthStateListeners(user);
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('EMAIL_EXISTS');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.message === 'USERNAME_EXISTS' || error.message === 'EMAIL_EXISTS') {
      throw error;
    }
    throw new Error(error.message || 'Failed to create account');
  }
};

// Email/Password Login
export const loginUser = async (usernameOrEmail: string, password: string): Promise<void> => {
  try {
    let email = usernameOrEmail;

    // If it's not an email format, try to find user by username
    if (!usernameOrEmail.includes('@')) {
      const userByUsername = await getUserByUsername(usernameOrEmail);
      if (!userByUsername) {
        throw new Error('Invalid username or password');
      }
      
      // If email is not available from lookup, the user might not have a user_lookups entry
      // This can happen if they registered before we added the lookup feature
      if (!userByUsername.email || userByUsername.email === '') {
        // Email not available - user likely doesn't have a user_lookups entry
        // For now, ask them to use email. In the future, we can auto-create lookups
        console.warn(`User "${usernameOrEmail}" found but email not available from lookup. They may need a user_lookups entry created.`);
        throw new Error('Please use your email address to log in. Username login requires a lookup entry that may not exist for your account yet.');
      }
      
      email = userByUsername.email;
    }

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Fetch user data from Firestore
    const user = await getUserById(firebaseUser.uid);
    if (!user) {
      throw new Error('User data not found');
    }

    // Store user ID in localStorage for compatibility
    localStorage.setItem(RIOT_USER_ID_KEY, firebaseUser.uid);
    
    notifyAuthStateListeners(user);
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid username or password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }
    throw new Error(error.message || 'Failed to sign in');
  }
};

// Password Reset
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      // Don't reveal if user exists or not for security
      // Still show success message
      return;
    }
    throw new Error(error.message || 'Failed to send password reset email');
  }
};
