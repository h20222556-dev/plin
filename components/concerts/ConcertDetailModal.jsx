'use client';

import styles from './ConcertDetailModal.module.css';
import { MapPin, Calendar, CreditCard, Ticket, ChevronRight, X, Bookmark, Music, PlusCircle, ExternalLink } from 'lucide-react';

export default function ConcertDetailModal({ concert, onClose, onBookmark, onNavigate, onAddRecord }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        <div className={styles.header}>
          <div className={styles.artistEmoji}>
            <Music size={32} color="#667085" />
          </div>
          <div className={styles.headerInfo}>
            <h2 className={styles.name}>{concert.name}</h2>
            <p className={styles.artist}>{concert.artist}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} color="#667085" />
          </button>
        </div>

        <div className={styles.detailList}>
          <div className={styles.detailItem}>
            <Calendar size={18} color="#667085" />
            <span>{concert.date} {concert.time}</span>
          </div>
          <button 
            className={`${styles.detailItem} ${styles.clickableItem}`}
            onClick={() => {
              onClose();
              if(onNavigate) onNavigate('records');
            }}
          >
            <MapPin size={18} color="#0054CB" />
            <span style={{ color: '#0054CB', textDecoration: 'underline' }}>{concert.venue}, {concert.city}</span>
          </button>
          <div className={styles.detailItem}>
            <CreditCard size={18} color="#667085" />
            <span>{concert.price}</span>
          </div>
          <div className={styles.detailItem}>
            <Ticket size={18} color="#667085" />
            <span>예매 시작: {concert.ticketingDate}</span>
          </div>
        </div>

        <p className={styles.description}>{concert.description}</p>

        <div className={styles.genres}>
          {concert.genre.map(g => (
            <span key={g} className={styles.genreChip}>{g}</span>
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.bookmarkBtn} onClick={onBookmark}>
            <Bookmark size={20} fill={concert.isBookmarked ? '#0054CB' : 'none'} color={concert.isBookmarked ? '#0054CB' : '#667085'} />
            <span>{concert.isBookmarked ? '찜 해제' : '찜하기'}</span>
          </button>
          <a
            href={concert.ticketingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ flex: 2, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>{concert.status === 'sold_out' ? '매진된 공연' : '예매 사이트로'}</span>
            {concert.status !== 'sold_out' && <ExternalLink size={16} />}
          </a>
        </div>

        <button 
          className={styles.addRecordBtn}
          onClick={() => {
            onClose();
            if(onAddRecord) onAddRecord(concert);
          }}
        >
          <PlusCircle size={20} />
          <span>이 공연 지도로 기록하기</span>
        </button>

        {concert.reviewCount > 0 && (
          <button className={styles.reviewLink}>
            <span>이 공연 후기 보러가기 ({concert.reviewCount}개)</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
