'use client';

import { useState } from 'react';
import styles from './PostCard.module.css';
import { Heart, MessageCircle, Share2, Music, User, ArrowUp, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function PostCard({ post, onLike, onAuthorClick, onDelete }) {
  const { user } = useAuth();
  const isAuthor = user && user.id === post.author.id;
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

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
    // In a real app, use navigator.share or copy link to clipboard
    alert('게시글 링크가 클립보드에 복사되었습니다.');
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
            <User size={20} color="#0054CB" />
          </div>
          <div className={styles.authorInfo}>
            <div className={styles.authorName}>
              {post.author.nickname}
              {!post.author.isPublic && <span className={styles.privateTag}>비공개</span>}
            </div>
            <div className={styles.authorMeta}>
              <span className={styles.concertTag}>
                <Music size={12} style={{marginRight: 4}} />
                {post.concert}
              </span>
              <span className={styles.time}>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Content */}
      <p className={styles.content}>{post.content}</p>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className={styles.tags}>
          {post.tags.map((t, i) => (
            <span key={i} className={styles.tag}>#{t}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${post.isLiked ? styles.liked : ''}`}
          onClick={onLike}
        >
          <Heart size={18} fill={post.isLiked ? "#F04438" : "none"} color={post.isLiked ? "#F04438" : "#667085"} />
          <span>{post.likes}</span>
        </button>
        <button
          className={`${styles.actionBtn} ${showComments ? styles.activeAction : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle size={18} color={showComments ? "#0054CB" : "#667085"} />
          <span>{post.comments}</span>
        </button>
        <button className={styles.actionBtn} onClick={handleShare}>
          <Share2 size={18} color="#667085" />
          <span>공유</span>
        </button>
        {isAuthor && onDelete && (
          <button 
            className={styles.actionBtn} 
            onClick={() => confirm('이 게시글을 삭제하시겠습니까?') && onDelete(post.id)}
            style={{ marginLeft: 'auto' }}
          >
            <Trash2 size={18} color="#F04438" />
            <span style={{ color: '#F04438' }}>삭제</span>
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
              onClick={() => {
                setCommentInput('');
                // Real app: submit comment
              }}
            >
              <ArrowUp size={16} color="white" />
            </button>
          </div>
          
          <div className={styles.commentList}>
            <div className={styles.comment}>
              <div className={styles.commentAvatar}>
                <User size={14} color="#0054CB" />
              </div>
              <div className={styles.commentContent}>
                <span className={styles.commentAuthor}>핑크드림</span>
                <p className={styles.commentText}>저도 그 공연 갔어요! 진짜 최고였죠 ㅠㅠ</p>
              </div>
            </div>
            {/* Real app: render real comments map */}
          </div>
        </div>
      )}
    </div>
  );
}
