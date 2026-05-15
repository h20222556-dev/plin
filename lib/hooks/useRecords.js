'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const RecordsContext = createContext(null);

export function RecordsProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRecords = useCallback(async () => {
    // 유저가 로딩 중이어도 공개 데이터는 가져올 수 있도록 함
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
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
  }, []);

  useEffect(() => {
    fetchRecords();

    // 실시간 구독: 데이터 변경 시 자동 갱신
    const subscription = supabase
      .channel('records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchRecords, user?.id]); // 유저 ID가 바뀌면 다시 불러옴

  const addRecord = async (record) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('performances')
        .insert([{
          user_id: user.id,
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
        .select()
        .single();

      if (error) throw error;
      
      // 실시간 구독이 fetchRecords를 호출하므로 여기서 setRecords를 직접 안 해도 되지만, 
      // 즉각적인 반응을 위해 fetchRecords를 호출해줍니다.
      await fetchRecords();
      return data;
    } catch (err) {
      console.error('Error adding record:', err.message);
      alert(`저장에 실패했습니다: ${err.message}`);
      throw err;
    }
  };

  const deleteRecord = async (id) => {
    try {
      const { error } = await supabase
        .from('performances')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      console.error('Error deleting record:', err.message);
      alert('삭제에 실패했습니다.');
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
  if (!context) {
    throw new Error('useRecords must be used within a RecordsProvider');
  }
  return context;
}
