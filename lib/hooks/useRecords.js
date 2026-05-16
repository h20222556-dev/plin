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
    // 데모 모드일 때는 필터링 없이 전체 조회하거나 필요 시 로직 조정
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
        // demo_performances에 concert_name이 없을 경우를 대비해 r.name 등 대체 필드 확인
        concertName: r.concert_name || r.name || '알 수 없는 공연',
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
      let insertData = {
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
      };

      // 데모 모드와 일반 모드의 컬럼명 차이 대응
      if (isDemoMode) {
        // 데모 모드: user_id(UUID 타입오류) 및 is_public(컬럼부재) 제외
        insertData.name = record.concertName;
      } else {
        if (!user) throw new Error('로그인이 필요합니다.');
        insertData.user_id = user.id;
        insertData.concert_name = record.concertName;
        insertData.is_public = record.isPublic;
      }

      console.log(`[${isDemoMode ? 'DEMO' : 'REAL'}] Inserting to ${TABLE_NAME}:`, insertData);

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
