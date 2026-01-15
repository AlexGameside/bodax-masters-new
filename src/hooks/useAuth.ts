import { useState, useEffect } from 'react';
import { initializeAuth, onAuthStateChange, getCurrentUser } from '../services/authService';
import type { User } from '../types/tournament';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth from localStorage
    const initAuth = async () => {
      setLoading(true);
      const user = await initializeAuth();
      setCurrentUser(user);
      setLoading(false);
    };

    initAuth();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshUser = async () => {
    const user = await initializeAuth();
    setCurrentUser(user);
  };

  const retryAuthStateCheck = async () => {
    const user = await initializeAuth();
    setCurrentUser(user);
  };

  return {
    currentUser,
    loading,
    refreshUser,
    retryAuthStateCheck
  };
};
