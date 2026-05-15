'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

const RecordsContext = createContext(null);

const DEMO_RECORDS = [
  {
    id: "demo-1",
    userId: "demo-user",
    concertName: "2024 IU 콘서트 - HEREH WORLD TOUR",
    artist: "아이유 (IU)",
    date: "2024-11-23",
    venue: "올림픽공원 KSPO돔",
    lat: 37.5203,
    lng: 127.1220,
    weather: "sunny",
    pinIcon: "heart",
    memo: "평생 잊지 못할 공연. 라일락 라이브 무대에서 눈물이 났다.",
    setlist: ["라일락", "Blueming", "Love wins all"],
    tags: ["아이유", "HER_TOUR"],
    photos: [],
    isPublic: true,
  },
  {
    id: "demo-2",
    userId: "demo-user",
    concertName: "세계문화축전 - BTS 특별공연",
    artist: "BTS",
    date: "2024-10-05",
    venue: "잠실종합운동장 주경기장",
    lat: 37.5155,
    lng: 127.0726,
    weather: "sunny",
    pinIcon: "flame",
    memo: "7명이 함께한 무대. 역대급 퍼포먼스였다.",
    setlist: ["Dynamite", "Butter", "Spring Day"],
    tags: ["BTS", "ARMY"],
    photos: [],
    isPublic: true,
  },
  {
    id: "demo-3",
    userId: "demo-user",
    concertName: "검정치마 단독공연 - EVERYTHING",
    artist: "검정치마",
    date: "2024-09-14",
    venue: "예스24 라이브홀",
    lat: 37.5465,
    lng: 127.0471,
    weather: "cloudy",
    pinIcon: "music",
    memo: "작은 공간에서 느끼는 밴드 사운드는 차원이 달랐다.",
    setlist: ["Everything", "Antifreeze"],
    tags: ["검정치마", "인디"],
    photos: [],
    isPublic: true,
  },
  {
    id: "demo-4",
    userId: "demo-user",
    concertName: "새소년 단독공연 - 사건의 지평선",
    artist: "새소년",
    date: "2024-08-30",
    venue: "홍대 롤링홀",
    lat: 37.5557,
    lng: 126.9241,
    weather: "rainy",
    pinIcon: "star",
    memo: "황소윤의 목소리는 실제로 들으면 더 압도적이다.",
    setlist: ["파도", "난춘"],
    tags: ["새소년", "밴드"],
    photos: [],
    isPublic: true,
  },
  {
    id: "demo-5",
    userId: "demo-user",
    concertName: "Classic Odyssey - 서울시향 정기연주회",
    artist: "서울시립교향악단",
    date: "2024-07-19",
    venue: "롯데콘서트홀",
    lat: 37.5128,
    lng: 127.1026,
    weather: "sunny",
    pinIcon: "music",
    memo: "말러 교향곡 9번. 마지막 음이 사라지고 한동안 아무도 박수를 치지 않았다.",
    setlist: ["말러 9번"],
    tags: ["클래식", "서울시향"],
    photos: [],
    isPublic: true,
  },
  {
    id: "demo-6",
    userId: "demo-user",
    concertName: "혁오 10주년 콘서트",
    artist: "혁오 (Hyukoh)",
    date: "2024-06-08",
    venue: "올림픽공원 88잔디마당",
    lat: 37.5215,
    lng: 127.1198,
    weather: "sunny",
    pinIcon: "heart",
    memo: "야외에서 듣는 TOMBOY는 진짜였다. 바람까지 완벽한 날씨.",
    setlist: ["TOMBOY", "위잉위잉"],
    tags: ["혁오", "10주년"],
    photos: [],
    isPublic: true,
  }
];

export function RecordsProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode } = useAuth();

  const fetchRecords = useCallback(async () => {
    if (isDemoMode) {
      setRecords(DEMO_RECORDS);
      setLoading(false);
      return;
    }

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
  }, [isDemoMode]);

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
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (isDemoMode) {
      const newRecord = {
        ...record,
        id: `demo-${Date.now()}`,
        userId: user.id,
        createdAt: new Date().toISOString(),
      };
      setRecords(prev => [newRecord, ...prev]);
      return newRecord;
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
      await fetchRecords();
      return data;
    } catch (err) {
      console.error('Error adding record:', err.message);
      alert(`저장에 실패했습니다: ${err.message}`);
      throw err;
    }
  };

  const deleteRecord = async (id) => {
    if (isDemoMode) {
      setRecords(prev => prev.filter(r => r.id !== id));
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
