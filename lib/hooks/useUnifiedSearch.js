'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { parseMemoAndSeat } from './useRecords';

const PIN_EMOJI_MAP = {
  music: '🎵',
  flame: '🔥',
  heart: '❤️',
  star: '⭐'
};

export function useUnifiedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    records: [],
    concerts: [],
    posts: [],
    users: [],
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const performSearch = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({ records: [], concerts: [], posts: [], users: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 검색어 로그 저장 (비동기로 진행)
      supabase
        .from('search_logs')
        .insert({ keyword: trimmed })
        .then(({ error }) => {
          if (error) console.error('검색 로그 저장 실패:', error.message);
        });

      // 1. 지도 기록(Records) 검색
      let recordsData = [];
      let recordsError = null;

      try {
        if (trimmed.startsWith('#')) {
          const tag = trimmed.substring(1).trim();
          if (tag) {
            const { data, error } = await supabase
              .from('performances')
              .select('id, user_id, concert_name, artist, date, venue, lat, lng, pin_icon, memo, weather, setlist, tags, photos, is_public, created_at')
              .contains('tags', [tag])
              .limit(10);
            recordsData = data || [];
            recordsError = error;
          }
        } else {
          const orFilter = `concert_name.ilike.%${trimmed}%,artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%,tags.cs.{"${trimmed}"}`;
          
          const { data, error } = await supabase
            .from('performances')
            .select('id, user_id, concert_name, artist, date, venue, lat, lng, pin_icon, memo, weather, setlist, tags, photos, is_public, created_at')
            .or(orFilter)
            .limit(10);
          
          if (error) {
            console.warn('Fallback search due to:', error.message);
            const fallbackFilter = `concert_name.ilike.%${trimmed}%,artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%`;
            
            const { data: fbData, error: fbError } = await supabase
              .from('performances')
              .select('id, user_id, concert_name, artist, date, venue, lat, lng, pin_icon, memo, weather, setlist, tags, photos, is_public, created_at')
              .or(fallbackFilter)
              .limit(10);
            
            recordsData = fbData || [];
            recordsError = fbError;
          } else {
            recordsData = data || [];
          }
        }
      } catch (err) {
        console.error('Records search failed:', err);
        recordsError = err;
      }

      // 2. 커뮤니티(Posts) 검색
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .ilike('content', `%${trimmed}%`)
        .limit(10);

      // 3. 프로필(Users) 검색
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, nickname, profile_emoji, avatar_url, is_public, show_records, show_posts')
        .ilike('nickname', `%${trimmed}%`)
        .limit(10);

      if (recordsError) console.error('Records search error:', recordsError.message);
      if (postsError) console.error('Posts search error:', postsError.message);
      if (usersError) console.error('Users search error:', usersError.message);

      const formattedRecords = (recordsData || []).map(r => {
        const parsed = parseMemoAndSeat(r.memo);
        return {
          id: r.id,
          userId: r.user_id,
          concertName: r.concert_name || '알 수 없는 공연',
          artist: r.artist || '',
          date: r.date || '',
          venue: r.venue || '',
          lat: r.lat,
          lng: r.lng,
          weather: r.weather || 'sunny',
          pinIcon: r.pin_icon || 'music',
          emotion: PIN_EMOJI_MAP[r.pin_icon] || r.pin_icon || '🎵',
          memo: parsed.memo,
          seat: parsed.seat,
          setlist: r.setlist || [],
          tags: r.tags || [],
          photos: r.photos || [],
          isPublic: r.is_public ?? true,
          createdAt: r.created_at,
        };
      });

      const formattedPosts = await Promise.all(
        (postsData || []).map(async p => {
          let authorInfo = { nickname: '알 수 없는 사용자', profile_emoji: '🧑‍🎤', avatar_url: null };
          if (p.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('nickname, profile_emoji, avatar_url')
              .eq('id', p.user_id)
              .single();
            if (userData) {
              authorInfo = userData;
            }
          }
          return {
            id: p.id,
            content: p.content,
            likes: p.likes_count || 0,
            emotion: p.emotion || '🔥',
            createdAt: p.created_at,
            author: {
              nickname: authorInfo.nickname,
              profileEmoji: authorInfo.profile_emoji,
              avatarUrl: authorInfo.avatar_url || null
            }
          };
        })
      );

      const formattedUsers = await Promise.all(
        (usersData || []).map(async u => {
          let recordsCount = 0;
          let postsCount = 0;

          if (u.is_public !== false) {
            if (u.show_records !== false) {
              const { count } = await supabase
                .from('performances')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);
              recordsCount = count || 0;
            }
            if (u.show_posts !== false) {
              const { count } = await supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', u.id);
              postsCount = count || 0;
            }
          }

          return {
            id: u.id,
            nickname: u.nickname,
            profileEmoji: u.profile_emoji || '🧑‍🎤',
            avatarUrl: u.avatar_url || null,
            isPublic: u.is_public !== false,
            showRecords: u.show_records !== false,
            showPosts: u.show_posts !== false,
            recordsCount,
            postsCount
          };
        })
      );

      setResults({
        records: formattedRecords,
        concerts: [],
        posts: formattedPosts,
        users: formattedUsers,
      });

    } catch (err) {
      console.error('Unified search overall error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
