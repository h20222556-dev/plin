'use client';

import React from 'react';
import { AuthProvider } from '@/lib/hooks/useAuth';
import { RecordsProvider } from '@/lib/hooks/useRecords';
import MainLayout from '@/components/layout/MainLayout';

export default function ProfileSettingsPage() {
  return (
    <AuthProvider>
      <RecordsProvider>
        <MainLayout initialTab="profile" initialSection="settings" />
      </RecordsProvider>
    </AuthProvider>
  );
}
