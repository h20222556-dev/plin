'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './ChatList.module.css';
import { Sparkles, Clock, User, X, Loader2 } from 'lucide-react';
import { getRecommendedMates } from '@/lib/recommendMates';

export default function ChatList({ onOpenChat }) {
  const { user, isDemoMode } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI 추천 관련 상태 추가
  const [showRecs, setShowRecs] = useState(false);
  
  useEffect(() => {
    if (showRecs) {
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
  }, [showRecs]);

  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const handleShowRecs = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    setShowRecs(true);
    setRecsLoading(true);
    try {
      const mates = await getRecommendedMates(user.id);
      setRecs(mates);
    } catch (err) {
      console.error('추천 메이트 로드 실패:', err);
    } finally {
      setRecsLoading(false);
    }
  };

  const handleStartChatFromRec = async (targetUser) => {
    if (!user) return;
    setStartingChat(true);
    try {
      // 1. 기존 채팅방 존재 여부 체크
      const { data: existingRoom, error: queryError } = await supabase
        .from('chat_rooms')
        .select('*')
        .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${targetUser.userId}),and(user_a_id.eq.${targetUser.userId},user_b_id.eq.${user.id})`)
        .maybeSingle();

      if (queryError) throw queryError;

      if (existingRoom) {
        onOpenChat({
          roomId: existingRoom.id,
          recipientId: targetUser.userId,
          recipientNickname: targetUser.nickname,
          expiresAt: existingRoom.expires_at,
        });
        setShowRecs(false);
        return;
      }

      // 2. 신규 채팅방 생성 (3일 뒤 만료)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);
      const expiresAtIso = expiresAt.toISOString();

      const { data: newRoom, error: insertError } = await supabase
        .from('chat_rooms')
        .insert([{
          user_a_id: user.id,
          user_b_id: targetUser.userId,
          expires_at: expiresAtIso,
          is_extended: false,
          is_blocked: false
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      onOpenChat({
        roomId: newRoom.id,
        recipientId: targetUser.userId,
        recipientNickname: targetUser.nickname,
        expiresAt: newRoom.expires_at,
      });
      setShowRecs(false);
    } catch (err) {
      console.error('대화 시작 실패:', err.message);
      alert('대화방 생성에 실패했습니다.');
    } finally {
      setStartingChat(false);
    }
  };

  // 데모 여부에 따른 테이블명 결정
  const CHATS_TABLE = isDemoMode ? 'demo_chats' : 'chats';

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_rooms')
          .select('*')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

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

            // 마지막 메시지 (분리된 테이블에서 조회)
            const { data: lastMsgData } = await supabase
              .from(CHATS_TABLE)
              .select('message, created_at, sender_id, is_read')
              .eq('room_id', room.id)
              .order('created_at', { ascending: false })
              .limit(1);

            const lastMsg = lastMsgData?.[0] || null;

            // 읽지 않은 메시지 수 (분리된 테이블에서 조회)
            const { count: unread } = await supabase
              .from(CHATS_TABLE)
              .select('id', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('receiver_id', user.id)
              .eq('is_read', false);

            const isExpired = room.expires_at
              ? new Date(room.expires_at) < new Date()
              : false;

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
              isBlocked: room.is_blocked || false,
              blockedBy: room.blocked_by,
              isExtended: room.is_extended || false,
            };
          })
        );

        if (isDemoMode) {
          const { MOCK_CHATS } = require('@/lib/mockData');
          const mockEnriched = MOCK_CHATS.map(mc => {
            const isExpired = mc.expiresAt
              ? new Date(mc.expiresAt) < new Date()
              : false;
            return {
              roomId: mc.roomId,
              recipientId: mc.recipientId,
              recipientNickname: mc.recipientNickname,
              recipientEmoji: mc.recipientEmoji,
              lastMessage: mc.lastMessage,
              lastMessageAt: mc.lastMessageAt,
              expiresAt: mc.expiresAt,
              unread: mc.unread,
              isExpired,
              isBlocked: mc.isBlocked || false,
              blockedBy: mc.blockedBy || null,
              isExtended: mc.isExtended || false,
            };
          });

          // Prepend mock chats, keeping roomIds unique
          const combined = [...mockEnriched];
          enriched.forEach(c => {
            if (!combined.some(x => x.roomId === c.roomId)) {
              combined.push(c);
            }
          });
          setChats(combined);
        } else {
          setChats(enriched);
        }
      } catch (err) {
        console.error(`Error fetching chats from ${CHATS_TABLE}:`, err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // 실시간 구독
    const channel = supabase
      .channel('chat_rooms_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, fetchChats)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: CHATS_TABLE }, fetchChats)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, isDemoMode, CHATS_TABLE]);

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

  const getTimeLeft = (expiresAt, isExtended) => {
    if (isExtended) return '';
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const hr = Math.floor(diff / 3600000);
    if (hr < 24) return `${hr}시간 후 삭제`;
    const day = Math.floor(hr / 24);
    return `${day}일 후 삭제`;
  };

  const handleOpen = (chat) => {
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
        <button className={styles.aiBtn} onClick={handleShowRecs}>보기</button>
      </div>

      {/* Ephemeral notice */}
      <div className={styles.notice}>
        <Clock size={16} color="#0054CB" />
        <p>채팅은 처음 메시지로부터 <strong>3일 후 자동 만료</strong>됩니다.</p>
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
          const timeLeft = getTimeLeft(chat.expiresAt, chat.isExtended);
          return (
            <button
              key={chat.roomId}
              className={`${styles.chatItem} ${chat.isExpired || chat.isBlocked ? styles.expired : ''}`}
              onClick={() => handleOpen(chat)}
            >
              <div className={styles.chatAvatar}>
                {chat.recipientEmoji ? (
                  <span style={{ fontSize: 24 }}>{chat.recipientEmoji}</span>
                ) : (
                  <User size={24} color="#0054CB" />
                )}
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
                {chat.isBlocked ? (
                  <span className={styles.expiredBadge} style={{ backgroundColor: '#ff3b30', color: 'white' }}>차단됨</span>
                ) : chat.isExpired ? (
                  <span className={styles.expiredBadge}>만료됨</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Recommendation Panel */}
      {showRecs && (
        <div 
          className={`modal-overlay ${styles.overlay}`} 
          onClick={e => e.target === e.currentTarget && setShowRecs(false)}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div 
            className={`modal-sheet ${styles.sheet}`} 
          >
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI 공연 메이트 추천</h2>
              <button onClick={() => setShowRecs(false)} style={{ padding: 4 }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ maxHeight: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {recsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '8px' }}>
                  <Loader2 className={styles.spinner} size={32} color="var(--primary)" />
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>메이트를 찾는 중입니다...</p>
                </div>
              ) : recs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
                  아직 추천할 메이트가 없어요. 공연을 더 기록해보세요!
                </div>
              ) : (
                recs.map(mate => (
                  <div key={mate.userId} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar" style={{ width: '40px', height: '40px', background: 'var(--gradient-brand-soft)', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '20px' }}>{mate.profile_emoji}</span>
                        </div>
                        <div>
                          <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{mate.nickname}</h4>
                          <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>매칭 점수: {mate.score}점</span>
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => handleStartChatFromRec(mate)}
                        disabled={startingChat}
                        style={{ padding: '8px 16px', fontSize: '13px', height: '36px' }}
                      >
                        대화 시작하기
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px' }}>
                      {mate.reasons.map((reason, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
