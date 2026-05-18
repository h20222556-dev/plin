'use client';

import { useEffect } from 'react';

export default function ConnectionWatcher() {
  useEffect(() => {
    const handleOffline = () => {
      console.warn('네트워크 연결이 끊어졌습니다.');
    };

    const handleOnline = () => {
      console.log('네트워크 연결이 복구되었습니다.');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}
