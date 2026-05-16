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
    setIsDemoMode(false);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) throw error;

      // 구글 메타데이터에서 이름 추출
      const googleName = authUser?.user_metadata?.full_name || 
                         authUser?.user_metadata?.name || 
                         authUser?.user_metadata?.nickname ||
                         authUser?.email?.split('@')[0];

      if (data) {
        // 기존 유저인데 닉네임이 '새로운 유저'이거나 비어있는 경우 자동 업데이트
        if (data.nickname === '새로운 유저' && googleName) {
           const { data: updatedUser } = await supabase
            .from('users')
            .update({ nickname: googleName })
            .eq('id', userId)
            .select()
            .single();
          setUser(updatedUser || data);
        } else {
          setUser(data);
        }
      } else {
        // 프로필이 없는 경우 새로 생성
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{ 
            id: userId, 
            nickname: googleName || '새로운 유저',
            profile_emoji: '🧑‍🎤',
            is_public: true
          }])
          .select()
          .single();
          
        if (insertError) throw insertError;
        setUser(newUser);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setIsDemoMode(false);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  const updateProfile = async (updates) => {
    if (!user) return;
    if (isDemoMode) {
      setUser(prev => ({ ...prev, ...updates }));
      return;
    }

    const keyMap = {
      isPublic: 'is_public',
      profileEmoji: 'profile_emoji',
      nickname: 'nickname',
      bio: 'bio'
    };

    const dbUpdates = Object.fromEntries(
      Object.entries(updates).map(([k, v]) => [keyMap[k] ?? k, v])
    );

    try {
      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    setUser({
      id: '00000000-0000-0000-0000-000000000001',
      nickname: '데모 유저',
      profile_emoji: '✨',
      is_public: false
    });
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loginWithGoogle, updateProfile, enterDemoMode, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
