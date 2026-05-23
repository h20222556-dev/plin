'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './PostDetailModal.module.css';
import { X, Heart, MessageCircle, ArrowUp, User, Music } from 'lucide-react';

export default function PostDetailModal({ post: initialPost, onClose, onLike }) {
  const { user, isDemoMode } = useAuth();
  const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;

  const [post, setPost] = useState(initialPost);
  const [commentsList, setCommentsList] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const COMMENTS_TABLE = isDemoMode ? 'demo_comments' : 'comments';

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      let query;
      if (isDemoMode) {
        query = supabase
          .from(COMMENTS_TABLE)
          .select('*')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });
      } else {
        query = supabase
          .from(COMMENTS_TABLE)
          .select('*, users(nickname, profile_emoji)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });
      }
      const { data, error } = await query;
      if (error) throw error;
      setCommentsList(data || []);
    } catch (err) {
      console.error('댓글 조회 실패:', err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (post?.id) {
      fetchComments();
    }
  }, [post?.id]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      let insertQuery = supabase
        .from(COMMENTS_TABLE)
        .insert([{
          post_id: post.id,
          user_id: currentUserId,
          content: commentInput.trim()
        }]);

      if (isDemoMode) {
        insertQuery = insertQuery.select('*').single();
      } else {
        insertQuery = insertQuery.select('*, users(nickname, profile_emoji)').single();
      }

      const { data: newComment, error } = await insertQuery;

      if (error) throw error;
      setCommentInput('');
      setCommentsList(prev => [...prev, newComment]);
      
      // Update local post comment count
      setPost(prev => ({
        ...prev,
        comments: (prev.comments || 0) + 1
      }));
    } catch (err) {
      console.error('댓글 등록 실패:', err.message);
      alert('댓글 등록에 실패했습니다.');
    }
  };

  const handleLikeToggle = async () => {
    if (!onLike) return;
    // Parent handles actual likes sync
    await onLike(post.id, post.likes, post.isLiked);
    
    // Toggle locally for visual responsiveness
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? Math.max(prev.likes - 1, 0) : prev.likes + 1
    }));
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day}일 전`;
    if (hr > 0) return `${hr}시간 전`;
    if (min > 0) return `${min}분 전`;
    return '방금';
  };

  if (!post) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>게시물 상세</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <X size={20} color="#667085" />
          </button>
        </div>

        {/* Scroll Area */}
        <div className={styles.scrollArea}>
          {/* Author */}
          <div className={styles.author}>
            <div className={styles.avatar}>
              {post.author?.profileEmoji ? (
                <span>{post.author.profileEmoji}</span>
              ) : (
                <User size={20} color="#0054CB" />
              )}
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author?.nickname || '알 수 없는 유저'}
              </div>
              <div className={styles.authorMeta}>
                <span className={styles.concertTag}>
                  <Music size={12} style={{ marginRight: 4 }} />
                  {post.concert || '공연 정보 없음'}
                </span>
                <span>•</span>
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <p className={styles.postContent}>{post.content}</p>

          {/* Photos - Gallery */}
          {post.photos && post.photos.length > 0 && (
            <div className={styles.photoGallery}>
              {post.photos.map((p, i) => (
                <div key={i} className={styles.photoWrapper}>
                  <img src={p} alt={`Post attachment ${i + 1}`} className={styles.photo} />
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((t, i) => (
                <span key={i} className={styles.tag}>#{t}</span>
              ))}
            </div>
          )}

          {/* Actions - Likes */}
          <div className={styles.actionsRow}>
            <button
              className={`${styles.likeBtn} ${post.isLiked ? styles.liked : ''}`}
              onClick={handleLikeToggle}
            >
              <Heart size={18} fill={post.isLiked ? '#F04438' : 'none'} color={post.isLiked ? '#F04438' : '#667085'} />
              <span>좋아요 {post.likes}</span>
            </button>
            <div style={{ marginLeft: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#667085', fontWeight: 600 }}>
              <MessageCircle size={18} />
              <span>댓글 {post.comments}</span>
            </div>
          </div>

          {/* Comments Section */}
          <div className={styles.commentsSection}>
            <h3 className={styles.sectionTitle}>댓글 목록</h3>
            <div className={styles.commentList}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#667085' }}>불러오는 중...</div>
              ) : commentsList.length === 0 ? (
                <div className={styles.emptyComments}>아직 댓글이 없습니다. 첫 댓글을 남겨보세요! 💬</div>
              ) : (
                commentsList.map(c => {
                  const nickname = isDemoMode ? '데모 사용자' : (c.users?.nickname || '알 수 없는 유저');
                  const emoji = isDemoMode ? '✨' : (c.users?.profile_emoji || '🧑‍🎤');
                  return (
                    <div key={c.id} className={styles.commentItem}>
                      <div className={styles.commentAvatar}>{emoji}</div>
                      <div className={styles.commentBody}>
                        <div className={styles.commentHeader}>
                          <span className={styles.commentUser}>{nickname}</span>
                          <span className={styles.commentTime}>{timeAgo(c.created_at)}</span>
                        </div>
                        <span className={styles.commentText}>{c.content}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Comment Input */}
        <div className={styles.inputArea}>
          <input
            className={styles.inputField}
            placeholder="댓글을 입력하세요..."
            value={commentInput}
            onChange={e => setCommentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleAddComment()}
          />
          <button
            className={styles.sendBtn}
            disabled={!commentInput.trim()}
            onClick={handleAddComment}
          >
            <ArrowUp size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
