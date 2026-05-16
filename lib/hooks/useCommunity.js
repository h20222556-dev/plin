'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { MOCK_POSTS } from '../mockData';

export function useCommunity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode } = useAuth();

  const fetchPosts = useCallback(async () => {
    if (isDemoMode) {
      // 데모 모드: 로컬 Mock 데이터 사용
      setPosts(MOCK_POSTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users (
            id,
            nickname,
            profile_emoji,
            bio,
            is_public
          ),
          performances (
            concert_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 로그인 유저의 좋아요 여부 조회
      let likedPostIds = new Set();
      if (user && data && data.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        if (likes) {
          likedPostIds = new Set(likes.map(l => l.post_id));
        }
      }

      const formatted = (data ?? []).map(p => {
        const authorInfo = p.users || {};
        const perfInfo = p.performances || {};

        return {
          id: p.id,
          content: p.content || '',
          emotion: p.emotion,
          tags: p.tags || [],
          likes: p.likes_count || 0,
          createdAt: p.created_at,
          isLiked: likedPostIds.has(p.id),
          author: {
            id: p.user_id,
            nickname: authorInfo.nickname || '알 수 없는 유저',
            profileEmoji: authorInfo.profile_emoji || '🧑‍🎤',
            bio: authorInfo.bio || '',
            isPublic: authorInfo.is_public ?? true,
          },
          concert: perfInfo.concert_name || '공연 정보 없음'
        };
      });

      setPosts(formatted);
    } catch (err) {
      console.error('Error fetching posts:', err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    fetchPosts();

    if (isDemoMode) return;

    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchPosts, isDemoMode]);

  const createPost = async (content, tags = [], emotion = '', performanceId = null) => {
    if (isDemoMode) {
      // 데모 모드: 로컬 상태에만 추가
      const newPost = {
        id: `mock-post-${Date.now()}`,
        content,
        emotion,
        tags,
        likes: 0,
        createdAt: new Date().toISOString(),
        isLiked: false,
        author: {
          id: 'demo-user',
          nickname: '데모 유저',
          profileEmoji: '✨',
          bio: '데모 모드 체험 중입니다.',
          isPublic: true,
        },
        concert: '공연 기록 선택됨',
        comments: 0,
      };
      setPosts(prev => [newPost, ...prev]);
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          performance_id: performanceId || null,
          content,
          emotion: emotion || null,
          tags,
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error creating post:', err.message);
      alert('게시글 작성에 실패했습니다.');
      throw err;
    }
  };

  const toggleLike = async (postId, currentLikes, isLiked) => {
    if (isDemoMode) {
      // 데모 모드: 로컬 상태에서만 토글
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isLiked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 } 
          : p
      ));
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 낙관적 업데이트
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: !isLiked, likes: isLiked ? currentLikes - 1 : currentLikes + 1 }
          : p
      )
    );

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert([{ user_id: user.id, post_id: postId }]);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error toggling like:', err.message);
      fetchPosts();
    }
  };

  const deletePost = async (postId) => {
    if (isDemoMode) {
      setPosts(prev => prev.filter(p => p.id !== postId));
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err.message);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  const fetchUserRecords = async (userId) => {
    if (isDemoMode) return [];
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('id, concert_name, artist, date, venue')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching user records:', err.message);
      return [];
    }
  };

  return { posts, loading, createPost, toggleLike, deletePost, fetchUserRecords, isDemoMode };
}
