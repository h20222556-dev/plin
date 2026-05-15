'use client';

import styles from './RecordList.module.css';

export default function RecordList({ records, onSelectRecord }) {
  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎵</div>
        <h3>아직 기록이 없어요</h3>
        <p>첫 번째 공연을 기록해보세요!</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      <div className="stagger">
        {records.map((record, i) => (
          <button
            key={record.id}
            className={styles.card}
            onClick={() => onSelectRecord(record)}
          >
            {/* Left: Emotion + Date */}
            <div className={styles.cardLeft}>
              <div className={styles.emotionBadge}>{record.emotion || '🎵'}</div>
              <div className={styles.dateInfo}>
                <span className={styles.date}>{formatDate(record.date)}</span>
                <span className={styles.weather}>{record.weather}</span>
              </div>
            </div>

            {/* Center: Info */}
            <div className={styles.cardCenter}>
              <h3 className={styles.concertName}>{record.concertName}</h3>
              <p className={styles.artist}>{record.artist}</p>
              <p className={styles.venue}>📍 {record.venue}</p>
              {record.setlist && record.setlist.length > 0 && (
                <div className={styles.setlistPreview}>
                  {record.setlist.slice(0, 2).map((song, i) => (
                    <span key={i} className={styles.songChip}>{song}</span>
                  ))}
                  {record.setlist.length > 2 && (
                    <span className={styles.songMore}>+{record.setlist.length - 2}</span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Rating + Public */}
            <div className={styles.cardRight}>
              <div className={styles.rating}>
                {'⭐'.repeat(record.rating || 0)}
              </div>
              {record.isPublic ? (
                <span className={styles.publicBadge}>공개</span>
              ) : (
                <span className={styles.privateBadge}>비공개</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
