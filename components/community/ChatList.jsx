'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { MOCK_CHATS } from '@/lib/mockData';
import styles from './ChatList.module.css';
import { Sparkles, Clock, User } from 'lucide-react';

export default function ChatList({ onOpenChat }) {
  const { user, isDemoMode } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // 데모 모드: Mock 데이터 가공하여 표시
      const enriched = MOCK_CHATS.map(room => ({
        ...room,
        isExpired: new Date(room.expiresAt) < new Date(),
      }));
      setChats(enriched);
      setLoading(false);
      return;
    }

    if (!user) return;

    const fetchChats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('id, expires_at, created_at, user_a_id, user_b_id')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .order('expires_at', { ascending: false });

        if (error) throw error;

        // 상대방 프로필과 마지막 메시지 조회
        const enriched = await Promise.all(
          (data || []).map(async (room) => {
            const recipientId = room.user_a_id === user.id ? room.user_b_id : room.user_a_id;

            // 상대방 프로필
            const { data: recipient } = await supabase
              .from('users')
              .select('id, nickname, profile_emoji')
              .eq('id', recipientId)
              .single();

            // 마지막 메시지
            const { data: lastMsgData } = await supabase
              .from('chats')
              .select('message, created_at, sender_id, is_read')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1);

            const lastMsg = lastMsgData?.[0] || null;

            // 읽지 않은 메시지 수 (내가 받은 것 중 is_read=false)
            const { count: unread } = await supabase
              .from('chats')
              .select('id', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('receiver_id', user.id)
              .eq('is_read', false);

            const isExpired = new Date(room.expires_at) < new Date();

            return {
              roomId: room.id,
              recipientId,
              recipientNickname: recipient?.nickname || '알 수 없는 사용자',
              recipientEmoji: recipient?.profile_emoji || '🧑‍🎤',
              lastMessage: lastMsg?.message || '채팅을 시작하세요',
              lastMessageAt: lastMsg?.created_at || room.created_at,
              expiresAt: room.expires_at,
              unread: unread || 0,
              isExpired,
            };
          })
        );

        setChats(enriched);
      } catch (err) {
        console.error('Error fetching chats:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // 실시간 구독
    const channel = supabase
      .channel('chat_rooms_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, fetchChats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, fetchChats)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day}일 전`;
    if (hr > 0) return `${hr}시간 전`;
    if (min > 0) return `${min}분 전`;
    return '방금';
  };

  const getTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const hr = Math.floor(diff / 3600000);
    if (hr < 24) return `${hr}시간 후 삭제`;
    const day = Math.floor(hr / 24);
    return `${day}일 후 삭제`;
  };

  const handleOpen = (chat) => {
    if (chat.isExpired) return;
    onOpenChat({
      roomId: chat.roomId,
      recipientId: chat.recipientId,
      recipientNickname: chat.recipientNickname,
      expiresAt: chat.expiresAt,
    });
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

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#667085' }}>불러오는 중...</div>
      )}

      {/* Empty */}
      {!loading && chats.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#667085' }}>
          아직 채팅이 없습니다.<br />피드에서 다른 팬의 글을 보고 채팅을 시작해보세요!
        </div>
      )}

      {/* Chat items */}
      <div className="stagger">
        {chats.map(chat => {
          const timeLeft = getTimeLeft(chat.expiresAt);
          return (
            <button
              key={chat.roomId}
              className={`${styles.chatItem} ${chat.isExpired ? styles.expired : ''}`}
              onClick={() => handleOpen(chat)}
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
                  <span className={styles.chatName}>{chat.recipientNickname}</span>
                  <span className={styles.chatTime}>{timeAgo(chat.lastMessageAt)}</span>
                </div>
                <p className={styles.chatPreview}>{chat.lastMessage}</p>
                {chat.isExpired ? (
                  <span className={styles.expiredBadge}>만료됨</span>
                ) : timeLeft ? (
                  <span className={styles.timeBadge}><Clock size={12} style={{ marginRight: 2 }} /> {timeLeft}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
