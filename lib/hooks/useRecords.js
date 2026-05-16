'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { MOCK_RECORDS } from '../mockData';

const RecordsContext = createContext(null);

export function RecordsProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode } = useAuth();

  const fetchRecords = useCallback(async () => {
    if (isDemoMode) {
      // 데모 모드: Mock 데이터 사용 (로컬 상태)
      setRecords(MOCK_RECORDS);
      setLoading(false);
      return;
    }

    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const formatted = data.map(r => ({
        id: r.id,
        userId: r.user_id,
        concertName: r.concert_name,
        artist: r.artist,
        date: r.date,
        venue: r.venue,
        lat: r.lat,
        lng: r.lng,
        weather: r.weather,
        pinIcon: r.pin_icon,
        memo: r.memo,
        setlist: r.setlist || [],
        tags: r.tags || [],
        photos: r.photos || [],
        isPublic: r.is_public,
        createdAt: r.created_at,
      }));
      setRecords(formatted);
    } catch (err) {
      console.error('Error fetching records:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    fetchRecords();

    if (isDemoMode) return;

    // Real-time subscription (Only for non-demo)
    const subscription = supabase
      .channel('public:performances')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'performances', filter: `user_id=eq.${user?.id}` }, 
        () => fetchRecords()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchRecords, isDemoMode]);

  const addRecord = async (record) => {
    if (isDemoMode) {
      // 데모 모드: 로컬 상태에만 추가
      const newRecord = {
        ...record,
        id: `mock-${Date.now()}`,
        userId: 'demo-user',
        createdAt: new Date().toISOString(),
      };
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('performances')
        .insert([{
          user_id: user.id,
          concert_name: record.concertName,
          artist: record.artist,
          date: record.date,
          venue: record.venue,
          lat: record.lat,
          lng: record.lng,
          weather: record.weather,
          pin_icon: record.pinIcon,
          memo: record.memo,
          setlist: record.setlist,
          tags: record.tags,
          photos: record.photos,
          is_public: record.isPublic,
        }])
        .select();

      if (error) throw error;
      await fetchRecords();
      return data?.[0];
    } catch (err) {
      console.error('Error adding record:', err.message);
      throw err;
    }
  };

  const deleteRecord = async (id) => {
    if (isDemoMode) {
      // 데모 모드: 로컬 상태에서만 삭제
      setRecords(prev => prev.filter(r => r.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('performances')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      console.error('Error deleting record:', err.message);
    }
  };

  return (
    <RecordsContext.Provider value={{ records, loading, addRecord, deleteRecord, fetchRecords }}>
      {children}
    </RecordsContext.Provider>
  );
}

export const useRecords = () => useContext(RecordsContext);
