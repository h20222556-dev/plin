'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useCommunity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode } = useAuth();

  // 데모 여부에 따른 테이블명 결정
  const POSTS_TABLE = isDemoMode ? 'demo_posts' : 'posts';
  const LIKES_TABLE = isDemoMode ? 'demo_likes' : 'post_likes';

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query;
      if (isDemoMode) {
        // 데모 모드: users 테이블과 관계가 없으므로 Join 제거
        query = supabase
          .from(POSTS_TABLE)
          .select(`
            *,
            comment_count:demo_comments(count),
            like_count:demo_likes(count)
          `)
          .order('created_at', { ascending: false });
      } else {
        // 일반 모드: 기존 Join 유지
        query = supabase
          .from(POSTS_TABLE)
          .select(`
            *,
            users (
              id,
              nickname,
              profile_emoji,
              bio,
              is_public,
              show_posts
            ),
            performances (
              concert_name
            ),
            comment_count:comments(count),
            like_count:post_likes(count)
          `)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // 로그인 유저의 좋아요 여부 조회
      let likedPostIds = new Set();
      const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
      
      if (currentUserId && data && data.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: likes } = await supabase
          .from(LIKES_TABLE)
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds);
        
        if (likes) {
          likedPostIds = new Set(likes.map(l => l.post_id));
        }
      }

      const formatted = (data ?? []).map(p => {
        const cCount = p.comment_count?.[0]?.count ?? 0;
        const lCount = p.like_count?.[0]?.count ?? 0;
        if (isDemoMode) {
          // 데모 모드 전용 하드코딩된 작성자 정보
          return {
            id: p.id,
            content: p.content || '',
            emotion: p.emotion,
            tags: p.tags || [],
            likes: lCount,
            comments: cCount,
            commentCount: cCount,
            createdAt: p.created_at,
            isLiked: likedPostIds.has(p.id),
            author: {
              id: 'demo_user',
              nickname: '데모 사용자',
              profileEmoji: '✨',
              bio: '데모 체험 중입니다.',
              isPublic: true,
              showPosts: true,
            },
            concert: p.concert_name || '데모 공연'
          };
        }

        const authorInfo = p.users || {};
        const perfInfo = p.performances || {};

        return {
          id: p.id,
          content: p.content || '',
          emotion: p.emotion,
          tags: p.tags || [],
          likes: lCount,
          comments: cCount,
          commentCount: cCount,
          createdAt: p.created_at,
          isLiked: likedPostIds.has(p.id),
          author: {
            id: p.user_id,
            nickname: authorInfo.nickname || '알 수 없는 유저',
            profileEmoji: authorInfo.profile_emoji || '🧑‍🎤',
            bio: authorInfo.bio || '',
            isPublic: authorInfo.is_public ?? true,
            showPosts: authorInfo.show_posts ?? true,
          },
          concert: perfInfo.concert_name || '공연 정보 없음'
        };
      });

      const visiblePosts = formatted.filter(post => {
        if (post.author.id === currentUserId) return true;
        return post.author.isPublic !== false && post.author.showPosts !== false;
      });
      setPosts(visiblePosts);
    } catch (err) {
      console.error(`Error fetching posts from ${POSTS_TABLE}:`, err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemoMode, POSTS_TABLE, LIKES_TABLE]);

  useEffect(() => {
    fetchPosts();

    const subscription = supabase
      .channel(`public:${POSTS_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: POSTS_TABLE }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchPosts, POSTS_TABLE]);

  const createPost = async (content, tags = [], emotion = '', performanceId = null) => {
    const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const insertData = {
        user_id: currentUserId,
        content,
        emotion: emotion || null,
        tags,
      };

      if (!isDemoMode) {
        insertData.performance_id = performanceId || null;
      }

      const { error } = await supabase
        .from(POSTS_TABLE)
        .insert([insertData]);

      if (error) throw error;
      
      // 즉시 목록 갱신
      await fetchPosts();
    } catch (err) {
      console.error(`Error creating post in ${POSTS_TABLE}:`, err.message);
      alert('게시글 작성에 실패했습니다.');
      throw err;
    }
  };

  const toggleLike = async (postId, currentLikes, isLiked) => {
    const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 낙관적 업데이트
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: !isLiked, likes: isLiked ? Math.max(currentLikes - 1, 0) : (currentLikes + 1) }
          : p
      )
    );

    try {
      if (isLiked) {
        const { error } = await supabase
          .from(LIKES_TABLE)
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(LIKES_TABLE)
          .insert([{ user_id: currentUserId, post_id: postId }]);
        if (error) throw error;
      }
    } catch (err) {
      console.error(`Error toggling like in ${LIKES_TABLE}:`, err.message);
      fetchPosts();
    }
  };

  const deletePost = async (postId) => {
    try {
      const { error } = await supabase
        .from(POSTS_TABLE)
        .delete()
        .eq('id', postId);

      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error(`Error deleting post from ${POSTS_TABLE}:`, err.message);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const fetchUserRecords = async (userId) => {
    const PERF_TABLE = isDemoMode ? 'demo_performances' : 'performances';
    try {
      let query = supabase.from(PERF_TABLE).select('*').limit(5);

      if (isDemoMode) {
        query = query.order('date', { ascending: false });
      } else {
        query = query.eq('user_id', userId).order('date', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        concert_name: r.name || r.concert_name || '알 수 없는 공연',
        artist: r.artist,
        date: r.date,
        venue: r.venue
      }));
    } catch (err) {
      console.error(`Error fetching records from ${PERF_TABLE}:`, err.message);
      return [];
    }
  };

  return { posts, loading, createPost, toggleLike, deletePost, fetchUserRecords, fetchPosts, isDemoMode };
}
