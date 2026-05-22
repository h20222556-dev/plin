import { useState, useRef } from 'react';
import { emotionOptions } from '@/lib/mockData';
import { useRecords } from '@/lib/hooks/useRecords';
import { Music, Check, Hash, X } from 'lucide-react';
import styles from './NewPostModal.module.css';

export default function NewPostModal({ onClose, onPost }) {
  const { records } = useRecords();
  const [content, setContent] = useState('');
  const [selectedPerfId, setSelectedPerfId] = useState(null);
  const [emotion, setEmotion] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [customTags, setCustomTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  const addTag = (raw) => {
    const cleaned = raw.trim().replace(/^#+/, '');
    if (!cleaned) return;
    if (!customTags.includes(cleaned)) {
      setCustomTags(prev => [...prev, cleaned]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && customTags.length > 0) {
      setCustomTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (tag) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const selectedPerf = records.find(r => r.id === selectedPerfId);
      const perfTags = selectedPerf ? [selectedPerf.concertName] : [];
      // Merge concert tags + custom tags, deduplicated
      const mergedTags = [...new Set([...perfTags, ...customTags])];
      await onPost({
        content: content.trim(),
        performanceId: selectedPerfId,
        concert: selectedPerf?.concertName || '',
        emotion,
        tags: mergedTags,
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

          {/* Hashtag Input */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>해시태그</label>
            <div
              className={styles.hashtagInputBox}
              onClick={() => tagInputRef.current?.focus()}
            >
              {customTags.map(tag => (
                <span key={tag} className={styles.hashtagChip}>
                  <span className={styles.hashSymbol}>#</span>{tag}
                  <button
                    className={styles.hashtagRemoveBtn}
                    onClick={e => { e.stopPropagation(); removeTag(tag); }}
                    aria-label={`태그 ${tag} 삭제`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                className={styles.hashtagTextInput}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder={customTags.length === 0 ? '#BTS #concert 입력 후 Enter' : ''}
              />
            </div>
            <p className={styles.hashtagHint}>
              <Hash size={11} style={{ marginRight: 3 }} />
              Enter 또는 쉼표로 태그를 추가하세요
            </p>
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
