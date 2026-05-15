import { useState, useEffect } from 'react';
import { emotionOptions } from '@/lib/mockData';
import { useRecords } from '@/lib/hooks/useRecords';
import { Music, Check } from 'lucide-react';
import styles from './NewPostModal.module.css';

export default function NewPostModal({ onClose, onPost }) {
  const { records } = useRecords();
  const [content, setContent] = useState('');
  const [selectedPerfId, setSelectedPerfId] = useState(null);
  const [emotion, setEmotion] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const selectedPerf = records.find(r => r.id === selectedPerfId);
      await onPost({
        content: content.trim(),
        performanceId: selectedPerfId,
        concert: selectedPerf?.concertName || '',
        emotion,
        tags: selectedPerf ? [selectedPerf.concertName] : [],
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
            <label className={styles.label}>관련 공연 선택 (선택)</label>
            <div className={styles.perfList}>
              <button 
                className={`${styles.perfItem} ${!selectedPerfId ? styles.perfActive : ''}`}
                onClick={() => setSelectedPerfId(null)}
              >
                공연 없음
              </button>
              {records.map(perf => (
                <button
                  key={perf.id}
                  className={`${styles.perfItem} ${selectedPerfId === perf.id ? styles.perfActive : ''}`}
                  onClick={() => setSelectedPerfId(perf.id)}
                >
                  <Music size={14} style={{ marginRight: 4 }} />
                  <div className={styles.perfInfo}>
                    <span className={styles.perfName}>{perf.concertName}</span>
                    <span className={styles.perfDate}>{perf.date}</span>
                  </div>
                  {selectedPerfId === perf.id && <Check size={14} style={{ marginLeft: 4 }} />}
                </button>
              ))}
            </div>
            {records.length === 0 && (
              <p className={styles.emptyNote}>작성된 공연 기록이 없습니다.</p>
            )}
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
