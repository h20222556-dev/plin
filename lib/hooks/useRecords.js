'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const RecordsContext = createContext(null);



export function RecordsProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode, DEMO_USER_ID, DEMO_USER_IDS } = useAuth();

  const fetchRecords = useCallback(async () => {
    try {
      let query = supabase.from('performances').select('*');
      
      if (isDemoMode) {
        query = query.eq('user_id', DEMO_USER_ID);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('date', { ascending: false });

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

    const subscription = supabase
      .channel('records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchRecords, user?.id, isDemoMode]);

  const addRecord = async (record) => {
    // 1. Supabase에서 현재 인증된 유저 정보를 직접 가져옴
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('로그인이 필요합니다. (Auth error or user null)');
      alert('로그인이 필요한 서비스입니다.');
      return;
    }

    if (isDemoMode) {
      alert('데모 모드에서는 실제 저장이 되지 않습니다. 로그인 후 이용해주세요.');
      return;
    }

    try {
      console.log('Inserting to performances with user_id:', authUser.id);
      
      const { data, error } = await supabase
        .from('performances')
        .insert([{
          user_id: authUser.id, // 유저 ID 명시적 포함
          concert_name: record.concertName,
          artist: record.artist || '',
          date: record.date,
          venue: record.venue || '',
          lat: record.lat || null,
          lng: record.lng || null,
          weather: record.weather || 'sunny',
          pin_icon: record.pinIcon || 'music',
          memo: record.memo || '',
          setlist: record.setlist || [],
          tags: record.tags || [],
          photos: record.photos || [],
          is_public: record.isPublic ?? true
        }])
        .select();

      if (error) {
        console.error('insert 에러 상세:', error);
        alert(`저장 중 오류가 발생했습니다: ${error.message}`);
        throw error;
      }
      
      console.log('저장 성공:', data);
      await fetchRecords();
      return data?.[0];
    } catch (err) {
      console.error('addRecord catch block:', err);
      throw err;
    }
  };

  const deleteRecord = async (id) => {
    if (isDemoMode) {
      alert('데모 모드에서는 실제 삭제가 되지 않습니다. 로그인 후 이용해주세요.');
      return;
    }

    try {
      const { error } = await supabase.from('performances').delete().eq('id', id);
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

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within a RecordsProvider');
  return context;
}
