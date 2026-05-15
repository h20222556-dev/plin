'use client';

import { useState } from 'react';
import styles from './RecordDetailModal.module.css';

export default function RecordDetailModal({ record, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.emotionBig}>{record.emotion || '🎵'}</div>
            <div>
              <h2 className={styles.title}>{record.concertName}</h2>
              <p className={styles.artist}>{record.artist}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Meta */}
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span>📅</span>
            <span>{record.date}</span>
          </div>
          <div className={styles.metaItem}>
            <span>📍</span>
            <span>{record.venue}</span>
          </div>
          <div className={styles.metaItem}>
            <span>{record.weather}</span>
            <span>{'⭐'.repeat(record.rating || 0)}</span>
          </div>
        </div>

        {/* Setlist */}
        {record.setlist && record.setlist.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🎵 셋리스트</h3>
            <div className={styles.setlist}>
              {record.setlist.map((song, i) => (
                <div key={i} className={styles.setlistItem}>
                  <span className={styles.setlistNum}>{i + 1}</span>
                  <span className={styles.setlistSong}>{song}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memo */}
        {record.memo && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📝 나의 후기</h3>
            <p className={styles.memo}>{record.memo}</p>
          </div>
        )}

        {/* Tags */}
        {record.tags && record.tags.length > 0 && (
          <div className={styles.tags}>
            {record.tags.map((t, i) => (
              <span key={i} className="chip">#{t}</span>
            ))}
          </div>
        )}

        {/* Visibility */}
        <div className={styles.visibilityRow}>
          <span className={record.isPublic ? styles.publicBadge : styles.privateBadge}>
            {record.isPublic ? '🌍 공개' : '🔒 비공개'}
          </span>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={() => {
              if (confirm('이 기록을 삭제할까요?')) {
                onDelete(record.id);
                onClose();
              }
            }}
          >
            🗑️ 삭제
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPublic}`}
            onClick={() => onUpdate(record.id, { isPublic: !record.isPublic })}
          >
            {record.isPublic ? '🔒 비공개로' : '🌍 공개로'}
          </button>
        </div>
      </div>
    </div>
  );
}
