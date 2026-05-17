'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { MOCK_PERFORMANCES } from '../mockData';

export function useUnifiedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    records: [],
    concerts: [],
    posts: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const { isDemoMode } = useAuth();

  const performSearch = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({ records: [], concerts: [], posts: [], users: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. 공연(Concerts) 검색 - MOCK_PERFORMANCES 필터링
      const matchedConcerts = MOCK_PERFORMANCES.filter(c => 
        c.name.toLowerCase().includes(trimmed.toLowerCase()) || 
        c.artist.toLowerCase().includes(trimmed.toLowerCase())
      );

      // 2. 지도 기록(Records) 검색 - performances / demo_performances 테이블
      const recordsTable = isDemoMode ? 'demo_performances' : 'performances';
      let recordsQuery = supabase.from(recordsTable).select('*');
      if (isDemoMode) {
        recordsQuery = recordsQuery.or(`name.ilike.%${trimmed}%,artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%`);
      } else {
        recordsQuery = recordsQuery.or(`concert_name.ilike.%${trimmed}%,artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%`);
      }
      const { data: recordsData, error: recordsError } = await recordsQuery.limit(10);

      // 3. 커뮤니티(Posts) 검색 - posts / demo_posts 테이블
      const postsTable = isDemoMode ? 'demo_posts' : 'posts';
      const { data: postsData, error: postsError } = await supabase
        .from(postsTable)
        .select('*')
        .ilike('content', `%${trimmed}%`)
        .limit(10);

      // 4. 프로필(Users) 검색 - users 테이블
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nickname, profile_emoji')
        .ilike('nickname', `%${trimmed}%`)
        .limit(10);

      // 에러 확인 로그
      if (recordsError) console.error('Records search error:', recordsError.message);
      if (postsError) console.error('Posts search error:', postsError.message);
      if (usersError) console.error('Users search error:', usersError.message);

      // 데이터 가공
      const formattedRecords = (recordsData || []).map(r => ({
        id: r.id,
        concertName: r.name || r.concert_name || '알 수 없는 공연',
        artist: r.artist || '',
        date: r.date || '',
        venue: r.venue || '',
        lat: r.lat,
        lng: r.lng,
        emotion: r.pin_icon || '🎵'
      }));

      // 작성자 매칭
      const formattedPosts = await Promise.all(
        (postsData || []).map(async p => {
          let authorInfo = { nickname: '알 수 없는 사용자', profile_emoji: '🧑‍🎤' };
          if (p.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('nickname, profile_emoji')
              .eq('id', p.user_id)
              .single();
            if (userData) {
              authorInfo = userData;
            }
          }
          if (isDemoMode && (!p.user_id || p.user_id === '00000000-0000-0000-0000-000000000001')) {
            authorInfo = { nickname: '데모 사용자', profile_emoji: '✨' };
          }
          return {
            id: p.id,
            content: p.content,
            likes: p.likes_count || 0,
            emotion: p.emotion || '🔥',
            createdAt: p.created_at,
            author: {
              nickname: authorInfo.nickname,
              profileEmoji: authorInfo.profile_emoji
            }
          };
        })
      );

      const formattedUsers = (usersData || []).map(u => ({
        id: u.id,
        nickname: u.nickname,
        profileEmoji: u.profile_emoji || '🧑‍🎤',
      }));

      setResults({
        records: formattedRecords,
        concerts: matchedConcerts,
        posts: formattedPosts,
        users: formattedUsers,
      });

    } catch (err) {
      console.error('Unified search overall error:', err);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  // Debounce 처리 (500ms)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, performSearch]);

  return {
    query,
    setQuery,
    results,
    loading,
    refreshSearch: () => performSearch(query),
  };
}
