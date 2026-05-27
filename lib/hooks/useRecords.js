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
  const { user } = useAuth();

  const fetchRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('id, user_id, concert_name, artist, date, venue, lat, lng, pin_icon, memo, weather, setlist, tags, photos, is_public, created_at')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(r => {
        const parsed = parseMemoAndSeat(r.memo);
        return {
          id: r.id,
          userId: r.user_id,
          concertName: r.concert_name || '알 수 없는 공연',
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
      console.error('Error fetching records:', err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setRecords([]);
      setLoading(false);
      return;
    }
    fetchRecords();

    const subscription = supabase
      .channel('public:performances')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'performances' }, 
        () => fetchRecords(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id, fetchRecords]);

  const addRecord = async (record) => {
    if (!user) throw new Error('로그인이 필요합니다.');
    try {
      const rawMemo = formatMemoAndSeat(record.memo, record.seat);
      const insertData = {
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
        photos: record.photos || [],
        is_public: record.isPublic,
      };

      const { data, error } = await supabase
        .from('performances')
        .insert([insertData])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const r = data[0];
        const parsed = parseMemoAndSeat(r.memo);
        const newFormattedRecord = {
          id: r.id,
          userId: r.user_id,
          concertName: r.concert_name || '알 수 없는 공연',
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
      console.error('Error adding record:', err.message);
      throw err;
    }
  };

  const updateRecord = async (id, record) => {
    try {
      const rawMemo = formatMemoAndSeat(record.memo, record.seat);
      const updateData = {
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
        photos: record.photos || [],
        is_public: record.isPublic,
      };

      const { data, error } = await supabase
        .from('performances')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      await fetchRecords(true);
      return data?.[0];
    } catch (err) {
      console.error('Error updating record:', err.message);
      throw err;
    }
  };

  const [focusedRecord, setFocusedRecord] = useState(null);

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
    }
  };

  return (
    <RecordsContext.Provider value={{ records, loading, addRecord, updateRecord, deleteRecord, fetchRecords, focusedRecord, setFocusedRecord }}>
      {children}
    </RecordsContext.Provider>
  );
}

export const useRecords = () => useContext(RecordsContext);
