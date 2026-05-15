'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import LoginPage from '@/components/auth/LoginPage';
import MainLayout from '@/components/layout/MainLayout';
import SplashScreen from '@/components/ui/SplashScreen';

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;
  if (!user) return <LoginPage />;
  return <MainLayout />;
}
