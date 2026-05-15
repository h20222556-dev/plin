'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useCommunity() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users (
            nickname,
            profile_emoji,
            is_public
          ),
          performances (
            concert_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map(p => ({
        id: p.id,
        content: p.content,
        emotion: p.emotion,
        tags: p.tags,
        likes: p.likes_count,
        createdAt: p.created_at,
        isLiked: false, // You would need a likes table to track this per user
        author: {
          id: p.user_id,
          nickname: p.users?.nickname || '알 수 없는 유저',
          profileEmoji: p.users?.profile_emoji || '🧑‍🎤',
          isPublic: p.users?.is_public ?? true,
        },
        concert: p.performances?.concert_name || '관련 공연 없음',
        comments: 0 // You would need a comments table to count this
      }));

      setPosts(formatted);
    } catch (err) {
      console.error('Error fetching posts:', err.message);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  const createPost = async (content, tags = [], performanceId = null) => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          performance_id: performanceId,
          content,
          tags
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error creating post:', err.message);
      alert('게시글 작성에 실패했습니다.');
    }
  };

  const toggleLike = async (postId, currentLikes, isLiked) => {
    // In a real app, you'd insert/delete a row in a 'likes' table.
    // For now, we'll just increment/decrement the count on the post.
    try {
      const newCount = isLiked ? currentLikes - 1 : currentLikes + 1;
      
      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isLiked: !isLiked, likes: newCount } : p
      ));

      const { error } = await supabase
        .from('posts')
        .update({ likes_count: newCount })
        .eq('id', postId);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling like:', err.message);
      // Revert optimistic update on error by refetching
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
    } catch (err) {
      console.error('Error deleting post:', err.message);
      alert('게시글 삭제에 실패했습니다.');
    }
  };

  return { posts, loading, createPost, toggleLike, deletePost };
}
