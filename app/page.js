'use client';

import { AuthProvider } from '@/lib/hooks/useAuth';
import AppRouter from '@/components/AppRouter';

export default function Home() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
