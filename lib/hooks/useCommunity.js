'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useCommunity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemoMode, DEMO_USER_ID, DEMO_USER_IDS } = useAuth();

  const fetchPosts = useCallback(async () => {
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
          ),
          comments (
            count
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('fetchPosts error:', error.message);
        setPosts([]);
        return;
      }

      // 자바스크립트 레벨에서 필터링 (가장 확실한 방법)
      let filteredData = data ?? [];
      if (isDemoMode) {
        // 데모 모드: 데모 유저 그룹의 게시글만 표시
        filteredData = filteredData.filter(p => DEMO_USER_IDS.includes(p.user_id));
      } else {
        // 실제 모드: 데모 유저 그룹의 게시글을 제외하고 표시
        filteredData = filteredData.filter(p => !DEMO_USER_IDS.includes(p.user_id));
      }

      const formatted = filteredData.map(p => {
        const authorInfo = p.users || {};
        const perfInfo = p.performances || {};

        return {
          id: p.id,
          content: p.content || '',
          emotion: p.emotion,
          tags: p.tags || [],
          likes: p.likes_count || 0,
          createdAt: p.created_at,
          isLiked: false, // 좋아요 여부는 아래에서 별도 처리
          author: {
            id: p.user_id,
            nickname: authorInfo.nickname || '알 수 없는 유저',
            profileEmoji: authorInfo.profile_emoji || '🧑‍🎤',
            bio: authorInfo.bio || '',
            isPublic: authorInfo.is_public ?? true,
          },
          concert: perfInfo.concert_name || '공연 정보 없음',
          comments: p.comments?.[0]?.count || 0,
        };
      });

      // 로그인 유저의 좋아요 여부 동기화
      if (user && formatted.length > 0) {
        const postIds = formatted.map(p => p.id);
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        if (likes) {
          const likedSet = new Set(likes.map(l => l.post_id));
          formatted.forEach(p => {
            p.isLiked = likedSet.has(p.id);
          });
        }
      }

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

    const subscription = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchPosts]);

  const createPost = async (content, tags = [], emotion = '', performanceId = null) => {
    if (isDemoMode) {
      alert('데모 모드에서는 실제 저장이 되지 않습니다. 로그인 후 이용해주세요.');
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
      alert('데모 모드에서는 좋아요 기능이 제한됩니다. 로그인 후 이용해주세요.');
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
      // 실패 시 롤백
      fetchPosts();
    }
  };

  const deletePost = async (postId) => {
    if (isDemoMode) {
      alert('데모 모드에서는 실제 삭제가 되지 않습니다. 로그인 후 이용해주세요.');
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

  // 특정 유저의 공개 기록 조회 (UserProfileModal용)
  const fetchUserRecords = async (userId) => {
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

  return { posts, loading, createPost, toggleLike, deletePost, fetchUserRecords };
}
