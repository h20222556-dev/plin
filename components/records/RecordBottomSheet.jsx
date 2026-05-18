'use client';

import styles from './RecordBottomSheet.module.css';
import { Calendar, MapPin, CloudRain, Star, Music, FileText, Globe, Lock, Trash2, X } from 'lucide-react';

export default function RecordBottomSheet({ record, onClose, onUpdate, onDelete }) {
  if (!record) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconCircle}>
              <Music size={24} color="#0054CB" />
            </div>
            <div>
              <h2 className={styles.title}>{record.concertName}</h2>
              <p className={styles.artist}>{record.artist}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#667085" />
          </button>
        </div>

        <div className={styles.scrollArea}>
          {/* Meta */}
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Calendar size={16} color="#667085" />
              <span>{record.date}</span>
            </div>
            <div className={styles.metaItem}>
              <MapPin size={16} color="#667085" />
              <span>{record.venue}</span>
            </div>
            <div className={styles.metaItem}>
              <CloudRain size={16} color="#667085" />
              <div className={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={14} 
                    fill={i < (record.rating || 0) ? "#FDB022" : "none"} 
                    color={i < (record.rating || 0) ? "#FDB022" : "#D0D5DD"} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Setlist */}
          {record.setlist && record.setlist.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Music size={16} color="#0054CB" />
                <span>셋리스트</span>
              </h3>
              <div className={styles.setlist}>
                {record.setlist.map((song, i) => (
                  <div key={i} className={styles.setlistItem}>
                    <span className={styles.setlistNum}>{i + 1}</span>
                    <span className={styles.setlistSong}>{typeof song === 'string' ? song : `${song.title}${song.artist ? ` - ${song.artist}` : ''}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memo */}
          {record.memo && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <FileText size={16} color="#0054CB" />
                <span>나의 후기</span>
              </h3>
              <p className={styles.memo}>{record.memo}</p>
            </div>
          )}

          {/* Tags */}
          {record.tags && record.tags.length > 0 && (
            <div className={styles.tags}>
              {record.tags.map((t, i) => (
                <span key={i} className={styles.tagChip}>#{t}</span>
              ))}
            </div>
          )}

          {/* Actions & Visibility */}
          <div className={styles.actions}>
            <span className={record.isPublic ? styles.publicBadge : styles.privateBadge}>
              {record.isPublic ? <Globe size={14} /> : <Lock size={14} />}
              <span>{record.isPublic ? '전체 공개' : '비공개'}</span>
            </span>
            
            <div className={styles.actionBtns}>
              {onDelete && (
                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    if (confirm('이 기록을 삭제할까요?')) {
                      onDelete(record.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={16} color="#F04438" />
                  <span style={{ color: '#F04438' }}>삭제</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
