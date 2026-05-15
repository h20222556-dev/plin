'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // 데모 모드인 경우 세션 체크 건너뜀
    if (isDemoMode) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isDemoMode) return;
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isDemoMode]);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) throw error;

      if (data) {
        setUser(data);
      } else {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert([{
              id: userId,
              nickname: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.nickname || '새로운 유저',
              profile_emoji: '🧑‍🎤',
              is_public: true
            }])
            .select()
            .single();

          if (createError) throw createError;
          setUser(newProfile);
        }
      }
    } catch (error) {
      console.error('Error fetching/creating user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setIsDemoMode(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, nickname) => {
    setLoading(true);
    setIsDemoMode(false);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } }
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setIsDemoMode(false);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    if (!isDemoMode) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsDemoMode(false);
    setLoading(false);
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setUser({
      id: 'demo-user',
      nickname: '데모 유저',
      profile_emoji: '✨',
      is_public: false
    });
    setLoading(false);
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    if (isDemoMode) {
      setUser(prev => ({ ...prev, ...updates }));
      return;
    }

    const keyMap = { isPublic: 'is_public', profileEmoji: 'profile_emoji', nickname: 'nickname', bio: 'bio' };
    const dbUpdates = Object.fromEntries(Object.entries(updates).map(([k, v]) => [keyMap[k] ?? k, v]));

    try {
      const { data, error } = await supabase.from('users').update(dbUpdates).eq('id', user.id).select().single();
      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemoMode, login, signup, loginWithGoogle, logout, updateProfile, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
