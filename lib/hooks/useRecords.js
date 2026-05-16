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
    const targetUserId = isDemoMode ? null : user?.id;
    
    setLoading(true);
    try {
      let query = supabase.from(TABLE_NAME).select('*');
      
      if (!isDemoMode && targetUserId) {
        query = query.eq('user_id', targetUserId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map(r => ({
        id: r.id,
        userId: r.user_id,
        concertName: r.concert_name || r.name || '알 수 없는 공연',
        artist: r.artist,
        date: r.date,
        venue: r.venue,
        lat: r.lat || 37.5665, // 좌표 없을 시 기본값(서울)
        lng: r.lng || 126.9780,
        weather: r.weather || '☀️맑음',
        pinIcon: r.pin_icon || '✨',
        memo: r.memo || '',
        setlist: r.setlist || [],
        tags: r.tags || [],
        photos: r.photos || [],
        isPublic: r.is_public ?? true,
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

    const subscription = supabase
      .channel(`public:${TABLE_NAME}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLE_NAME }, 
        () => fetchRecords()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchRecords, TABLE_NAME]);

  const addRecord = async (record) => {
    try {
      let insertData = {};

      if (isDemoMode) {
        // 데모 모드: 최소한의 필수 필드만 포함 (에러 방지)
        insertData = {
          name: record.concertName,
          artist: record.artist,
          date: record.date,
          venue: record.venue,
          memo: record.memo,
          // lat, lng, weather, tags 등 존재 여부가 불확실한 컬럼은 모두 제외
        };
      } else {
        if (!user) throw new Error('로그인이 필요합니다.');
        insertData = {
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
        };
      }

      console.log(`[${isDemoMode ? 'DEMO' : 'REAL'}] Final Insert Data:`, insertData);

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([insertData])
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
