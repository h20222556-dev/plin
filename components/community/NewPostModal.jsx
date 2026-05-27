import { useState, useRef, useEffect } from 'react';
import { emotionOptions } from '@/lib/mockData';
import { useRecords } from '@/lib/hooks/useRecords';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Music, Check, Hash, X, Camera, Image } from 'lucide-react';
import styles from './NewPostModal.module.css';

export default function NewPostModal({ isOpen = true, onClose, onPost }) {
  const { records } = useRecords();
  const { user } = useAuth();

  const [content, setContent] = useState('');
  const [selectedPerfId, setSelectedPerfId] = useState(null);
  const [emotion, setEmotion] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [customTags, setCustomTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef(null);

  // 사진 업로드 상태
  const [images, setImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const photoInputRef = useRef(null);

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

  // 게시글 이미지 업로드
  const uploadPostImage = async (file) => {
    if (!user?.id) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error('Post image upload error:', err);
      return null;
    }
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const remaining = 4 - images.length;
    if (remaining <= 0) {
      alert('사진은 최대 4장까지 첨부할 수 있습니다.');
      e.target.value = '';
      return;
    }

    const selectedFiles = files.slice(0, remaining);
    setImageUploading(true);

    // 미리보기용 blob URL 추가
    const blobUrls = selectedFiles.map(f => ({ url: URL.createObjectURL(f), uploading: true }));
    setImages(prev => [...prev, ...blobUrls]);

    // Storage 업로드
    const uploadedUrls = await Promise.all(selectedFiles.map(uploadPostImage));
    const validUrls = uploadedUrls.filter(Boolean);

    setImages(prev => {
      const withoutBlobs = prev.filter(item => !blobUrls.some(b => b.url === item.url));
      return [...withoutBlobs, ...validUrls.map(url => ({ url, uploading: false }))];
    });

    setImageUploading(false);
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const selectedPerf = records.find(r => r.id === selectedPerfId);
      const perfTags = selectedPerf ? [selectedPerf.concertName] : [];
      const mergedTags = [...new Set([...perfTags, ...customTags])];
      const imageUrls = images.filter(i => !i.uploading).map(i => i.url);
      await onPost({
        content: content.trim(),
        performanceId: selectedPerfId,
        concert: selectedPerf?.concertName || '',
        emotion,
        tags: mergedTags,
        images: imageUrls,
      });
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'scroll';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen]);

  return (
    <div 
      className={`modal-overlay ${styles.overlay}`} 
      onClick={e => e.target === e.currentTarget && onClose()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className={`modal-sheet ${styles.sheet}`}>
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

          {/* 사진 첨부 영역 */}
          <div className={styles.fieldGroup}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className={styles.label}>사진 첨부 (최대 4장)</label>
              {images.length < 4 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={imageUploading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={14} />
                  <span>{imageUploading ? '업로드 중...' : '사진 추가'}</span>
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img
                      src={img.url}
                      alt={`첨부 ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        opacity: img.uploading ? 0.5 : 1,
                      }}
                    />
                    {img.uploading && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                        fontSize: '10px', color: 'white', fontWeight: 600,
                      }}>
                        업로드 중
                      </div>
                    )}
                    {!img.uploading && (
                      <button
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute', top: '-6px', right: '-6px',
                          width: '18px', height: '18px',
                          background: '#ff3b30', border: 'none', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={10} color="white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
            disabled={!content.trim() || isPosting || imageUploading}
          >
            {isPosting ? '게시 중...' : '게시하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
