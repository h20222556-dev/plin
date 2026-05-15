'use client';

import styles from './ChatList.module.css';
import { Sparkles, Clock, User } from 'lucide-react';

export default function ChatList({ chats, onOpenChat }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day}일 전`;
    if (hr > 0) return `${hr}시간 전`;
    return `${min}분 전`;
  };

  const getTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const hr = Math.floor(diff / 3600000);
    if (hr < 24) return `${hr}시간 후 삭제`;
    const day = Math.floor(hr / 24);
    return `${day}일 후 삭제`;
  };

  return (
    <div className={styles.list}>
      {/* AI Recommendation Banner */}
      <div className={styles.aiBanner}>
        <div className={styles.aiBannerContent}>
          <div className={styles.aiIcon}>
            <Sparkles size={20} color="#0054CB" />
          </div>
          <div>
            <h3 className={styles.aiTitle}>AI 공연 메이트 추천</h3>
            <p className={styles.aiDesc}>취향이 비슷한 팬을 발견했어요!</p>
          </div>
        </div>
        <button className={styles.aiBtn}>보기</button>
      </div>

      {/* Ephemeral notice */}
      <div className={styles.notice}>
        <Clock size={16} color="#0054CB" />
        <p>채팅은 마지막 메시지로부터 <strong>3일 후 자동 삭제</strong>됩니다.</p>
      </div>

      {/* Chat items */}
      <div className="stagger">
        {chats.map(chat => {
          const timeLeft = getTimeLeft(chat.expiresAt);
          return (
            <button
              key={chat.id}
              className={`${styles.chatItem} ${chat.isExpired ? styles.expired : ''}`}
              onClick={() => !chat.isExpired && onOpenChat(chat)}
              disabled={chat.isExpired}
            >
              <div className={styles.chatAvatar}>
                <User size={24} color="#0054CB" />
                {chat.unread > 0 && (
                  <span className={styles.unreadDot}>{chat.unread}</span>
                )}
              </div>

              <div className={styles.chatInfo}>
                <div className={styles.chatTop}>
                  <span className={styles.chatName}>{chat.user.nickname}</span>
                  <span className={styles.chatTime}>{timeAgo(chat.lastMessageAt)}</span>
                </div>
                <p className={styles.chatPreview}>{chat.lastMessage}</p>
                {chat.isExpired ? (
                  <span className={styles.expiredBadge}>만료됨</span>
                ) : timeLeft ? (
                  <span className={styles.timeBadge}><Clock size={12} style={{marginRight: 2}} /> {timeLeft}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
