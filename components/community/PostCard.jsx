'use client';

import { useState, useEffect } from 'react';
import styles from './PostCard.module.css';
import { Heart, MessageCircle, Share2, Music, User, ArrowUp, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function PostCard({ post, onLike, onAuthorClick, deletePost, onPostClick }) {
  const { user, isDemoMode } = useAuth();
  const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
  const authorId = post.author?.id;
  const isAuthor = user && user.id === authorId;
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    setCommentCount(post.comments || 0);
  }, [post.comments]);

  const [commentsList, setCommentsList] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const COMMENTS_TABLE = isDemoMode ? 'demo_comments' : 'comments';

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
      setCommentCount(prev => prev + 1);
      post.comments = (post.comments || 0) + 1;
    } catch (err) {
      console.error('댓글 등록 실패:', err.message);
      alert('댓글 등록에 실패했습니다.');
    }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (commentId) => {
    if (!editingContent.trim()) return;

    try {
      const { error } = await supabase
        .from(COMMENTS_TABLE)
        .update({
          content: editingContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      setCommentsList(prev =>
        prev.map(c =>
          c.id === commentId
            ? { ...c, content: editingContent.trim() }
            : c
        )
      );

      setEditingCommentId(null);
      setEditingContent('');
    } catch (err) {
      console.error('댓글 수정 실패:', err.message);
      alert('댓글 수정에 실패했습니다.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('댓글을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from(COMMENTS_TABLE)
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // 댓글 목록에서 즉시 제거
      setCommentsList(prev => prev.filter(c => c.id !== commentId));

      // 게시글 댓글 수 즉시 감소
      setCommentCount(prev => Math.max(prev - 1, 0));
      post.comments = Math.max((post.comments || 1) - 1, 0);
    } catch (err) {
      console.error('댓글 삭제 실패:', err.message);
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  const handleToggleComments = () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow) {
      fetchComments();
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day}일 전`;
    if (hr > 0) return `${hr}시간 전`;
    if (min > 0) return `${min}분 전`;
    return '방금';
  };

  const handleShare = () => {
    alert('게시글 링크가 클립보드에 복사되었습니다.');
  };

  // 게시글 삭제 로직 (supabase와 직접 통신하여 처리)
  const handleDelete = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      if (deletePost) {
        await deletePost(post.id);
      }
    } catch (err) {
      console.error('게시글 삭제 실패:', err.message);
      alert('게시글 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.card}>
      {/* Author */}
      <div className={styles.author}>
        <button
          className={styles.authorBtn}
          onClick={() => onAuthorClick && onAuthorClick(post.author)}
        >
          <div className={styles.avatar}>
            {post.author?.profileEmoji ? (
              <span style={{ fontSize: 20 }}>{post.author.profileEmoji}</span>
            ) : (
              <User size={20} color="#0054CB" />
            )}
          </div>
          <div className={styles.authorInfo}>
            <div className={styles.authorName}>
              {post.author?.nickname || '알 수 없는 유저'}
              {post.author && !post.author.isPublic && <span className={styles.privateTag}>비공개</span>}
            </div>
            <div className={styles.authorMeta}>
              <span className={styles.concertTag}>
                <Music size={12} style={{ marginRight: 4 }} />
                {post.concert}
              </span>
              <span className={styles.time}>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Content */}
      <div onClick={() => onPostClick && onPostClick(post)} style={{ cursor: onPostClick ? 'pointer' : 'default' }}>
        <p className={styles.content}>{post.content}</p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className={styles.tags}>
            {post.tags.map((t, i) => (
              <span key={i} className={styles.tag}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${post.isLiked ? styles.liked : ''}`}
          onClick={onLike}
        >
          <Heart size={18} fill={post.isLiked ? '#F04438' : 'none'} color={post.isLiked ? '#F04438' : '#667085'} />
          <span>{post.likes}</span>
        </button>
        <button
          className={`${styles.actionBtn} ${showComments ? styles.activeAction : ''}`}
          onClick={handleToggleComments}
        >
          <MessageCircle size={18} color={showComments ? '#0054CB' : '#667085'} />
          <span>{commentCount}</span>
        </button>
        <button className={styles.actionBtn} onClick={handleShare}>
          <Share2 size={18} color="#667085" />
          <span>공유</span>
        </button>

        {/* 본인 게시글이고 삭제 함수가 전달되었을 때만 삭제 버튼 표시 */}
        {isAuthor && deletePost && (
          <button
            className={styles.actionBtn}
            onClick={handleDelete}
            disabled={isDeleting}
            style={{ marginLeft: 'auto' }}
          >
            <Trash2 size={18} color={isDeleting ? '#98A2B3' : '#F04438'} />
            <span style={{ color: isDeleting ? '#98A2B3' : '#F04438' }}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </span>
          </button>
        )}
      </div>

      {/* Comments Area */}
      {showComments && (
        <div className={styles.commentsArea}>
          <div className={styles.commentInput}>
            <input
              className="input-field"
              placeholder="댓글을 입력하세요..."
              style={{ fontSize: 13, padding: '10px 12px', flex: 1, border: 'none', background: 'none' }}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
            />
            <button
              className={styles.sendBtn}
              disabled={!commentInput.trim()}
              onClick={handleAddComment}
            >
              <ArrowUp size={16} color="white" />
            </button>
          </div>

          <div className={styles.commentList} style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '10px' }}>
            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: '10px', fontSize: 12, color: '#667085' }}>불러오는 중...</div>
            ) : commentsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', fontSize: 12, color: '#667085' }}>첫 댓글을 작성해보세요! 💬</div>
            ) : (
              commentsList.map(c => {
                const nickname = isDemoMode ? '데모 사용자' : (c.users?.nickname || '알 수 없는 유저');
                const emoji = isDemoMode ? '✨' : (c.users?.profile_emoji || '🧑‍🎤');
                return (
                  <div key={c.id} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid #F2F4F7', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16 }}>{emoji}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: '600', color: '#344054' }}>{nickname}</span>
                        {c.user_id === currentUserId && editingCommentId !== c.id && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleStartEdit(c)}
                              style={{ fontSize: 11, color: '#0054CB', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontWeight: '500' }}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{ fontSize: 11, color: '#F04438', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontWeight: '500' }}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingCommentId === c.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          <input
                            className="input-field"
                            style={{ fontSize: 13, padding: '6px 8px', borderRadius: '6px', border: '1px solid #D0D5DD', width: '100%', outline: 'none' }}
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleSaveEdit(c.id)}
                              style={{ fontSize: 11, padding: '4px 8px', backgroundColor: '#0054CB', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{ fontSize: 11, padding: '4px 8px', backgroundColor: '#F2F4F7', color: '#344054', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: '#475467', whiteSpace: 'pre-wrap' }}>{c.content}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
