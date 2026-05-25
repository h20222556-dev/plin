'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const RecordsContext = createContext(null);

export function parseMemoAndSeat(rawMemo) {
  if (!rawMemo) return { seat: '', memo: '' };
  const match = rawMemo.match(/^\[좌석:\s*([^\]]*)\]\s*(.*)/s);
  if (match) {
    return {
      seat: match[1] || '',
      memo: match[2] || ''
    };
  }
  return { seat: '', memo: rawMemo };
}

export function formatMemoAndSeat(memo, seat) {
  const cleanSeat = (seat || '').trim();
  const cleanMemo = (memo || '').trim();
  if (cleanSeat) {
    return `[좌석: ${cleanSeat}] ${cleanMemo}`;
  }
  return cleanMemo;
}

export function RecordsProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode } = useAuth();

  // 데모 여부에 따른 테이블명 결정
  const TABLE_NAME = isDemoMode ? 'demo_performances' : 'performances';

  const fetchRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      let query = supabase.from(TABLE_NAME).select('id, user_id, name, concert_name, artist, date, venue, lat, lng, pin_icon, memo, weather, setlist, tags, photos, is_public, created_at');
      
      // 일반 모드에서만 user_id 필터링 적용
      if (!isDemoMode && user?.id) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map(r => {
        const parsed = parseMemoAndSeat(r.memo);
        return {
          id: r.id,
          userId: r.user_id || 'demo_user',
          // 새 스키마의 name 필드 또는 기존 concert_name 참조
          concertName: r.name || r.concert_name || '알 수 없는 공연',
          artist: r.artist,
          date: r.date,
          venue: r.venue,
          lat: r.lat || 37.5665,
          lng: r.lng || 126.9780,
          weather: r.weather,
          pinIcon: r.pin_icon,
          memo: parsed.memo,
          seat: parsed.seat,
          setlist: r.setlist || [],
          tags: r.tags || [],
          photos: r.photos || [],
          isPublic: r.is_public ?? true,
          createdAt: r.created_at,
        };
      });
      setRecords(formatted);
    } catch (err) {
      console.error(`Error fetching records from ${TABLE_NAME}:`, err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.id, isDemoMode, TABLE_NAME]);

  useEffect(() => {
    fetchRecords();

    const subscription = supabase
      .channel(`public:${TABLE_NAME}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLE_NAME }, 
        () => fetchRecords(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchRecords, TABLE_NAME]);

  const addRecord = async (record) => {
    try {
      let insertData = {};
      const rawMemo = formatMemoAndSeat(record.memo, record.seat);

      if (isDemoMode) {
        // 새 demo_performances 스키마에 맞춘 데이터 구성
        insertData = {
          name: record.concertName, // title -> name 으로 일치
          artist: record.artist,
          date: record.date,
          venue: record.venue,
          memo: rawMemo,
          lat: record.lat,
          lng: record.lng,
          weather: record.weather,
          pin_icon: record.pinIcon || '🎵',
          setlist: record.setlist,
          tags: record.tags,
          photos: record.photos
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
          pin_icon: record.pinIcon || '🎵',
          memo: rawMemo,
          setlist: record.setlist,
          tags: record.tags,
          photos: record.photos,
          is_public: record.isPublic,
        };
      }

      console.log(`[${isDemoMode ? 'DEMO' : 'REAL'}] Inserting with new schema:`, insertData);

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([insertData])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const r = data[0];
        const parsed = parseMemoAndSeat(r.memo);
        const newFormattedRecord = {
          id: r.id,
          userId: r.user_id || 'demo_user',
          concertName: r.name || r.concert_name || '알 수 없는 공연',
          artist: r.artist,
          date: r.date,
          venue: r.venue,
          lat: r.lat || 37.5665,
          lng: r.lng || 126.9780,
          weather: r.weather,
          pinIcon: r.pin_icon,
          memo: parsed.memo,
          seat: parsed.seat,
          setlist: r.setlist || [],
          tags: r.tags || [],
          photos: r.photos || [],
          isPublic: r.is_public ?? true,
          createdAt: r.created_at,
        };
        setRecords(prev => [newFormattedRecord, ...prev]);
      }

      await fetchRecords(true);
      return data?.[0];
    } catch (err) {
      console.error(`Error adding record to ${TABLE_NAME}:`, err.message);
      throw err;
    }
  };

  const updateRecord = async (id, record) => {
    try {
      let updateData = {};
      const rawMemo = formatMemoAndSeat(record.memo, record.seat);

      if (isDemoMode) {
        updateData = {
          name: record.concertName,
          artist: record.artist,
          date: record.date,
          venue: record.venue,
          memo: rawMemo,
          lat: record.lat,
          lng: record.lng,
          weather: record.weather,
          pin_icon: record.pinIcon || '🎵',
          setlist: record.setlist,
          tags: record.tags,
          photos: record.photos
        };
      } else {
        updateData = {
          concert_name: record.concertName,
          artist: record.artist,
          date: record.date,
          venue: record.venue,
          lat: record.lat,
          lng: record.lng,
          weather: record.weather,
          pin_icon: record.pinIcon || '🎵',
          memo: rawMemo,
          setlist: record.setlist,
          tags: record.tags,
          photos: record.photos,
          is_public: record.isPublic,
        };
      }

      console.log(`[${isDemoMode ? 'DEMO' : 'REAL'}] Updating record ${id} with:`, updateData);

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      await fetchRecords(true);
      return data?.[0];
    } catch (err) {
      console.error(`Error updating record in ${TABLE_NAME}:`, err.message);
      throw err;
    }
  };

  const [focusedRecord, setFocusedRecord] = useState(null);

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
    <RecordsContext.Provider value={{ records, loading, addRecord, updateRecord, deleteRecord, fetchRecords, focusedRecord, setFocusedRecord }}>
      {children}
    </RecordsContext.Provider>
  );
}

export const useRecords = () => useContext(RecordsContext);

