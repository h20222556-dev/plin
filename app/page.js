'use client';

import { AuthProvider } from '@/lib/hooks/useAuth';
import { RecordsProvider } from '@/lib/hooks/useRecords';
import AppRouter from '@/components/AppRouter';

export default function Home() {
  return (
    <AuthProvider>
      <RecordsProvider>
        <AppRouter />
      </RecordsProvider>
    </AuthProvider>
  );
}
