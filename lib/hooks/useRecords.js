'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const RecordsContext = createContext(null);

export function RecordsProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode } = useAuth();

  // 데모 여부에 따른 테이블명 결정
  const TABLE_NAME = isDemoMode ? 'demo_performances' : 'performances';

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
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
      console.error(`Error fetching records from ${TABLE_NAME}:`, err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemoMode, TABLE_NAME]);

  useEffect(() => {
    fetchRecords();

    // Real-time subscription
    const subscription = supabase
      .channel(`public:${TABLE_NAME}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLE_NAME, filter: `user_id=eq.${user?.id}` }, 
        () => fetchRecords()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchRecords, TABLE_NAME]);

  const addRecord = async (record) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
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
      console.error(`Error adding record to ${TABLE_NAME}:`, err.message);
      throw err;
    }
  };

  const deleteRecord = async (id) => {
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      console.error(`Error deleting record from ${TABLE_NAME}:`, err.message);
    }
  };

  return (
    <RecordsContext.Provider value={{ records, loading, addRecord, deleteRecord, fetchRecords }}>
      {children}
    </RecordsContext.Provider>
  );
}

export const useRecords = () => useContext(RecordsContext);
