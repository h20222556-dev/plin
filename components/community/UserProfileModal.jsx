'use client';

import styles from './UserProfileModal.module.css';
import { X, User, MessageCircle, Heart, MapPin, Calendar, Music } from 'lucide-react';
import { mockRecords } from '@/lib/mockData';

export default function UserProfileModal({ user, onClose, onStartChat }) {
  if (!user) return null;

  // Mock data for the user's records
  const userRecords = mockRecords.slice(0, 2);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.handle} />
        
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#667085" />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.profileTop}>
            <div className={styles.avatar}>
              <User size={48} color="#0054CB" />
            </div>
            <h2 className={styles.nickname}>{user.nickname}</h2>
            {!user.isPublic && <span className={styles.privateBadge}>비공개 계정</span>}
            <p className={styles.bio}>{user.bio || '음악을 사랑하는 플린이'}</p>
            
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>12</span>
                <span className={styles.statLabel}>관람 기록</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statValue}>8</span>
                <span className={styles.statLabel}>작성글</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.chatBtn} onClick={onStartChat}>
              <MessageCircle size={18} />
              <span>채팅하기</span>
            </button>
            <button className={styles.followBtn}>
              <Heart size={18} color="#0054CB" />
              <span>팔로우</span>
            </button>
          </div>

          <div className={styles.recordsSection}>
            <h3 className={styles.sectionTitle}>최근 다녀온 공연</h3>
            {user.isPublic || user.isFollowing ? (
              <div className={styles.recordList}>
                {userRecords.map(record => (
                  <div key={record.id} className={styles.recordCard}>
                    <div className={styles.recordIcon}>
                      <Music size={20} color="#0054CB" />
                    </div>
                    <div className={styles.recordInfo}>
                      <h4 className={styles.recordName}>{record.concertName}</h4>
                      <p className={styles.recordArtist}>{record.artist}</p>
                      <div className={styles.recordMeta}>
                        <span><Calendar size={12} /> {record.date}</span>
                        <span><MapPin size={12} /> {record.venue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.privateState}>
                <User size={32} color="#98A2B3" />
                <p>비공개 계정입니다.</p>
                <span>팔로우하면 기록을 볼 수 있어요.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
