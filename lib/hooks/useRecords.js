'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform backend keys to match frontend if needed, 
      // but keeping it close to DB is also fine.
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
        setlist: r.setlist,
        tags: r.tags,
        isPublic: r.is_public,
        createdAt: r.created_at,
      }));
      setRecords(formatted);
    } catch (err) {
      console.error('Error fetching records:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    
    // Optional: Realtime subscription for records
    const subscription = supabase
      .channel('public:performances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performances' }, payload => {
        fetchRecords(); // re-fetch to simplify state, or manually patch state
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.id]); // Re-fetch when user auth state changes

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
          artist: record.artist,
          date: record.date,
          venue: record.venue,
          lat: record.lat || null,
          lng: record.lng || null,
          weather: record.weather,
          pin_icon: record.pinIcon,
          memo: record.memo,
          setlist: record.setlist || [],
          tags: record.tags || [],
          is_public: record.isPublic
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Realtime listener will auto-update, but we can do optimistic update
      return data;
    } catch (err) {
      console.error('Error adding record:', err.message);
      alert('기록 저장에 실패했습니다.');
      throw err;
    }
  };

  const updateRecord = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('performances')
        .update({
          concert_name: updates.concertName,
          artist: updates.artist,
          date: updates.date,
          venue: updates.venue,
          weather: updates.weather,
          pin_icon: updates.pinIcon,
          memo: updates.memo,
          is_public: updates.isPublic
          // add others as needed
        })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating record:', err.message);
    }
  };

  const deleteRecord = async (id) => {
    try {
      const { error } = await supabase
        .from('performances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting record:', err.message);
    }
  };

  return { records, loading, addRecord, updateRecord, deleteRecord, fetchRecords };
}
