import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from '../types/tournament';
import { getUserById } from './firebaseService';

// Store the current user in memory
let currentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

const RIOT_USER_ID_KEY = 'riot_user_id';

const notifyAuthStateListeners = (user: User | null) => {
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
    localStorage.removeItem(RIOT_USER_ID_KEY);
    notifyAuthStateListeners(null);
  } catch (error) {
    throw error;
  }
};

// Check if user is logged in (from localStorage)
export const getStoredUserId = (): string | null => {
  return localStorage.getItem(RIOT_USER_ID_KEY);
};

// Initialize auth state from localStorage
export const initializeAuth = async (): Promise<User | null> => {
  try {
    const userId = getStoredUserId();
    if (!userId) {
      notifyAuthStateListeners(null);
      return null;
    }
    
    const user = await getUserById(userId);
    if (user) {
      notifyAuthStateListeners(user);
      return user;
    } else {
      // User ID in localStorage but user doesn't exist in Firestore
      localStorage.removeItem(RIOT_USER_ID_KEY);
      notifyAuthStateListeners(null);
      return null;
    }
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
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
};

// Get current user
export const getCurrentUser = (): User | null => {
  return currentUser;
};

// Legacy functions (deprecated - kept for compatibility but will throw errors)
export const registerUser = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }): Promise<void> => {
  throw new Error('Registration is only available through Riot Sign-On. Please use the Riot login.');
};

export const loginUser = async (usernameOrEmail: string, password: string): Promise<void> => {
  throw new Error('Email/password login is no longer supported. Please use Riot Sign-On.');
};

export const resetPassword = async (email: string): Promise<void> => {
  throw new Error('Password reset is not available. Please use Riot Sign-On to sign in.');
};
