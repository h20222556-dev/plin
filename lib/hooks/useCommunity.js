'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useCommunity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
            avatar_url,
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

      if (error) throw error;

      // 로그인 유저의 좋아요 여부 조회
      let likedPostIds = new Set();
      if (user?.id && data && data.length > 0) {
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
        const cCount = p.comment_count?.[0]?.count ?? 0;
        const lCount = p.like_count?.[0]?.count ?? 0;
        const authorInfo = p.users || {};
        const perfInfo = p.performances || {};

        return {
          id: p.id,
          content: p.content || '',
          emotion: p.emotion,
          tags: p.tags || [],
          images: p.images || [],
          likes: lCount,
          comments: cCount,
          commentCount: cCount,
          createdAt: p.created_at,
          isLiked: likedPostIds.has(p.id),
          author: {
            id: p.user_id,
            nickname: authorInfo.nickname || '알 수 없는 유저',
            profileEmoji: authorInfo.profile_emoji || '🧑‍🎤',
            avatarUrl: authorInfo.avatar_url || null,
            bio: authorInfo.bio || '',
            isPublic: authorInfo.is_public ?? true,
            showPosts: authorInfo.show_posts ?? true,
          },
          concert: perfInfo.concert_name || '공연 정보 없음'
        };
      });

      const visiblePosts = formatted.filter(post => {
        if (post.author.id === user?.id) return true;
        return post.author.isPublic !== false && post.author.showPosts !== false;
      });
      setPosts(visiblePosts);
    } catch (err) {
      console.error('Error fetching posts:', err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  const createPost = async (content, tags = [], emotion = '', performanceId = null, images = []) => {
    if (!user?.id) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const insertData = {
        user_id: user.id,
        content,
        emotion: emotion || null,
        tags,
        performance_id: performanceId || null,
        images: images.length > 0 ? images : null,
      };

      const { error } = await supabase
        .from('posts')
        .insert([insertData]);

      if (error) throw error;
      
      await fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err.message);
      alert('게시글 작성에 실패했습니다.');
      throw err;
    }
  };

  const toggleLike = async (postId, currentLikes, isLiked) => {
    if (!user?.id) {
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
    try {
      const { data, error } = await supabase
        .from('performances')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        concert_name: r.concert_name || '알 수 없는 공연',
        artist: r.artist,
        date: r.date,
        venue: r.venue
      }));
    } catch (err) {
      console.error('Error fetching records:', err.message);
      return [];
    }
  };

  return { posts, loading, createPost, toggleLike, deletePost, fetchUserRecords, fetchPosts };
}
