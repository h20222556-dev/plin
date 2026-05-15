'use client';

import { useState } from 'react';
import { emotionOptions } from '@/lib/mockData';
import styles from './NewPostModal.module.css';

export default function NewPostModal({ onClose, onPost }) {
  const [content, setContent] = useState('');
  const [concert, setConcert] = useState('');
  const [emotion, setEmotion] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      await onPost({
        content: content.trim(),
        concert,
        emotion,
        tags: concert ? [concert] : [],
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className={styles.header}>
          <h2 className={styles.title}>새 게시물</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          <textarea
            className={styles.textarea}
            placeholder="공연 이야기를 나눠보세요 🎵"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            autoFocus
            maxLength={500}
          />

          <div className={styles.fieldGroup}>
            <label className={styles.label}>공연명 (선택)</label>
            <input
              className="input-field"
              placeholder="어떤 공연에 대한 이야기인가요?"
              value={concert}
              onChange={e => setConcert(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>감정</label>
            <div className={styles.emojiRow}>
              {emotionOptions.slice(0, 8).map(opt => (
                <button
                  key={opt.emoji}
                  className={`${styles.emojiBtn} ${emotion === opt.emoji ? styles.emojiActive : ''}`}
                  onClick={() => setEmotion(emotion === opt.emoji ? '' : opt.emoji)}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.charCount}>{content.length}/500</span>
          <button
            className="btn-primary"
            onClick={handlePost}
            disabled={!content.trim() || isPosting}
          >
            {isPosting ? '게시 중...' : '게시하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
