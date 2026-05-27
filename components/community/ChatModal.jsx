'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import styles from './ChatModal.module.css';
import { ChevronLeft, MoreVertical, Send, User, Clock, Info } from 'lucide-react';

/**
 * chat prop 구조:
 * {
 *   roomId: string,        // chat_rooms.id
 *   recipientId: string,   // 상대방 user id
 *   recipientNickname: string,
 *   expiresAt: string,     // ISO 날짜 문자열 (옵션)
 * }
 */
export default function ChatModal({ chat, onClose, isChatOpen = true }) {
  const { user, isDemoMode } = useAuth();

  const { messages, loading, sendMessage } = useChat(chat.roomId, chat.recipientId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [opponent, setOpponent] = useState(null);

  // 별점 평가 및 토스트 상태 추가
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(5);
  const [toastMessage, setToastMessage] = useState('');

  const [chatRoom, setChatRoom] = useState(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [showNotice, setShowNotice] = useState(false);

  const refetchChatRoom = useCallback(async () => {
    if (isDemoMode) {
      const { MOCK_CHATS } = require('@/lib/mockData');
      const mockRoom = MOCK_CHATS.find(r => r.roomId === chat.roomId);
      if (mockRoom) {
        const data = {
          id: mockRoom.roomId,
          user_a_id: '00000000-0000-0000-0000-000000000001',
          user_b_id: mockRoom.recipientId,
          expires_at: mockRoom.expiresAt,
          is_blocked: mockRoom.isBlocked ?? false,
          blocked_by: mockRoom.blockedBy ?? null,
          is_extended: mockRoom.isExtended ?? false,
        };
        setChatRoom(data);
      }
      setIsLoadingRoom(false);
      return;
    }

    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', chat.roomId)
      .single();

    if (error) {
      console.error('채팅방 조회 실패:', error.message);
      setIsLoadingRoom(false);
      return;
    }

    setChatRoom(data);
    setIsLoadingRoom(false);
  }, [chat.roomId, isDemoMode]);

  useEffect(() => {
    const key = "noticed_room_" + chat.roomId;
    if (!localStorage.getItem(key)) {
      setShowNotice(true);
      localStorage.setItem(key, "true");
    }
  }, [chat.roomId]);

  useEffect(() => {
    refetchChatRoom();

    if (isDemoMode) return;

    const channelName = `chat_room_${chat.roomId}`;
    const existingChannel = supabase.channel(channelName);
    supabase.removeChannel(existingChannel);

    const roomChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms', filter: `id=eq.${chat.roomId}` },
        (payload) => {
          const updatedRoom = payload.new;
          setChatRoom(updatedRoom);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [chat.roomId, isDemoMode, refetchChatRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchOpponent = async () => {
      if (isDemoMode) {
        const { MOCK_CHATS } = require('@/lib/mockData');
        const mockRoom = MOCK_CHATS.find(r => r.roomId === chat.roomId);
        if (mockRoom) {
          setOpponent({
            id: mockRoom.recipientId,
            nickname: mockRoom.recipientNickname,
            profile_emoji: mockRoom.recipientEmoji || '🧑‍🎤',
            bio: 'PLIN 공연 메이트입니다!'
          });
        } else {
          setOpponent({
            id: chat.recipientId,
            nickname: chat.recipientNickname || '데모 상대방',
            profile_emoji: '🧑‍🎤',
            bio: 'PLIN 공연 메이트입니다!'
          });
        }
        return;
      }

      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        let targetId = chat.recipientId;
        if (!targetId) {
          const { data: room } = await supabase
            .from('chat_rooms')
            .select('user_a_id, user_b_id')
            .eq('id', chat.roomId)
            .single();
          if (room) {
            targetId = room.user_a_id === currentUser.id ? room.user_b_id : room.user_a_id;
          }
        }

        if (!targetId) return;

        const { data: opponentData } = await supabase
          .from('users')
          .select('id, nickname, profile_emoji, bio')
          .eq('id', targetId)
          .single();

        if (opponentData) {
          setOpponent(opponentData);
        }
      } catch (err) {
        console.error('Error fetching opponent:', err);
      }
    };

    fetchOpponent();
  }, [chat.roomId, chat.recipientId, isDemoMode]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  useEffect(() => {
    const fetchExistingRating = async () => {
      const myUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
      const otherUserId = opponent?.id;
      if (!myUserId || !otherUserId) return;

      if (isDemoMode) return;

      try {
        const { data, error } = await supabase
          .from('user_ratings')
          .select('rating')
          .eq('rater_id', myUserId)
          .eq('rated_id', otherUserId)
          .maybeSingle();

        if (!error && data) {
          setSelectedRating(data.rating);
        }
      } catch (err) {
        console.error('Error fetching rating:', err);
      }
    };

    if (showRatingModal && opponent?.id) {
      fetchExistingRating();
    }
  }, [showRatingModal, opponent?.id, isDemoMode, user?.id]);

  const handleSaveRating = async () => {
    const myUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
    const otherUserId = opponent?.id;
    if (!myUserId || !otherUserId) {
      alert('평가 대상을 찾을 수 없습니다.');
      return;
    }

    if (isDemoMode) {
      showToast('평가가 완료됐어요!');
      setShowRatingModal(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_ratings')
        .upsert({
          rater_id: myUserId,
          rated_id: otherUserId,
          rating: selectedRating,
          chat_room_id: chat.roomId
        }, { onConflict: 'rater_id,rated_id' });

      if (error) throw error;

      showToast('평가가 완료됐어요!');
      setShowRatingModal(false);
    } catch (err) {
      console.error('별점 저장 실패:', err.message);
      alert('평가 저장에 실패했습니다: ' + err.message);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  const handleExtendChat = async () => {
    if (isDemoMode) {
      setChatRoom(prev => prev ? { ...prev, expires_at: null, is_extended: true } : prev);
      setShowMenu(false);
      showToast('대화가 계속 이어집니다! (데모 모드)');
      return;
    }

    const { error } = await supabase
      .from('chat_rooms')
      .update({ expires_at: null, is_extended: true })
      .eq('id', chat.roomId);

    if (error) {
      console.error('대화 계속 실패:', error.message);
      showToast('대화 계속하기에 실패했습니다.');
      return;
    }

    setChatRoom(prev => ({ ...prev, expires_at: null, is_extended: true }));
    setShowMenu(false);
    showToast('대화가 계속 이어집니다!');
  };

  const handleBlock = async () => {
    if (!opponent) return;

    if (isDemoMode) {
      const data = chatRoom ? { ...chatRoom, is_blocked: true, blocked_by: user?.id } : null;
      setChatRoom(data);
      setShowBlockConfirm(false);
      showToast('차단되었습니다. 더 이상 대화를 이어갈 수 없습니다. (데모 모드)');
      return;
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: opponent.id
        });

      if (blockError && blockError.code !== '23505') {
        console.error('차단 실패:', blockError.message);
        showToast('차단에 실패했습니다.');
        return;
      }

      const { error: roomError } = await supabase
        .from('chat_rooms')
        .update({
          is_blocked: true,
          blocked_by: currentUser.id
        })
        .eq('id', chat.roomId);

      if (roomError) {
        console.error('채팅방 차단 처리 실패:', roomError.message);
        showToast('차단 처리 실패');
        return;
      }

      setChatRoom(prev => ({ ...prev, is_blocked: true, blocked_by: currentUser.id }));
      setShowBlockConfirm(false);
      setShowMenu(false);
      showToast('차단되었습니다.');
    } catch (err) {
      console.error('차단 처리 중 오류:', err);
    }
  };

  // 차단 및 만료 상태 계산
  const isExpired = chatRoom?.expires_at ? new Date(chatRoom.expires_at) < new Date() : false;
  const isBlocked = chatRoom?.is_blocked === true;
  const isReadOnly = isExpired || isBlocked;



  // 대화 계속하기 버튼 표시 조건 수정
  // 차단되지 않은 경우 대화 계속하기 가능
  const showExtendButton = !isBlocked;

  const getTimeLeft = () => {
    if (isBlocked) return '차단됨';
    if (chatRoom?.is_extended) return ''; // 연장 시 타이머 미노출

    const target = chatRoom?.expires_at || chat.expiresAt;
    if (!target) return '';

    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return '만료됨';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  };

  const nickname = opponent?.nickname || chat.recipientNickname || '알 수 없는 사용자';

  useEffect(() => {
    if (isChatOpen) {
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
  }, [isChatOpen]);

  return (
    <div className={styles.overlay} onTouchMove={(e) => e.stopPropagation()}>
      <div className={styles.chatContainer}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <ChevronLeft size={24} color="#101828" />
          </button>

          <div className={styles.headerCenter}>
            <div className={styles.avatar}>
              <span style={{ fontSize: '18px' }}>{opponent?.profile_emoji || '🧑‍🎤'}</span>
            </div>
            <div>
              <h3 className={styles.name}>{nickname}</h3>
              {getTimeLeft() && (
                <div className={styles.timer}>
                  <Clock size={12} />
                  <span>{getTimeLeft()}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={20} color="#667085" />
            </button>

            {showMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 40,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                padding: '8px 0',
                zIndex: 100,
                minWidth: 200,
                border: '1px solid var(--border)'
              }}>
                {opponent && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <span style={{ fontSize: 32, marginBottom: 4 }}>{opponent.profile_emoji}</span>
                    <p style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{opponent.nickname}</p>
                    {opponent.bio && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{opponent.bio}</p>}
                  </div>
                )}

                {showExtendButton && (
                  <button
                    onClick={handleExtendChat}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--text-primary)',
                      fontWeight: '500'
                    }}
                  >
                    대화 계속하기
                  </button>
                )}

                {!isBlocked && (
                  <>
                    <button
                      onClick={() => {
                        setShowRatingModal(true);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: 'var(--text-primary)',
                        fontWeight: '500'
                      }}
                    >
                      평가하기
                    </button>
                    <button
                      onClick={() => {
                        setShowBlockConfirm(true);
                        setShowMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#ff3b30',
                        fontWeight: '500'
                      }}
                    >
                      차단하기
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {showNotice && !isExpired && !isBlocked && (
            <div className={styles.ephemeralNotice}>
              <Info size={14} color="#0054CB" style={{ flexShrink: 0 }} />
              <span>이 대화는 3일 후 만료됩니다. 서로를 존중하는 따뜻한 대화를 나눠주세요.</span>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#667085' }}>불러오는 중...</div>
          )}

          {!loading && messages.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👋</span>
              <p>첫 메시지를 보내 인사를 나눠보세요!</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isMine = msg.senderId === user?.id;
            const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId === user?.id);

            return (
              <div key={msg.id} className={`${styles.messageWrapper} ${isMine ? styles.mine : styles.theirs}`}>
                {!isMine && (
                  <div className={styles.msgAvatarWrapper}>
                    {showAvatar && (
                      <div className={styles.msgAvatar}>
                        <span style={{ fontSize: '14px' }}>{opponent?.profile_emoji || '🧑‍🎤'}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.messageContent}>
                  {!isMine && showAvatar && <span className={styles.msgName}>{nickname}</span>}
                  <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {isReadOnly ? (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            background: '#f8f8f8',
            borderTop: '1px solid #eee'
          }}>
            {isBlocked ? (
              <p style={{ fontSize: 14, color: '#888' }}>
                차단된 대화방입니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <p style={{ fontSize: 14, color: '#888' }}>
                  만료된 대화방입니다. 이전 대화 내용만 열람할 수 있습니다.
                </p>
                <button
                  onClick={handleExtendChat}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 20,
                    border: 'none',
                    background: '#007AFF',
                    color: 'white',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  대화 계속하기
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.inputArea}>
            <div className={styles.inputContainer}>
              <input
                className={styles.input}
                placeholder="메시지를 입력하세요..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && send()}
              />
              <button
                className={styles.sendBtn}
                onClick={send}
                disabled={!input.trim()}
              >
                <Send size={18} color="white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 700
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            margin: '0 20px',
            maxWidth: 320,
            width: '100%',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>정말로 차단하시겠습니까?</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              차단하면 더 이상 대화를 이어갈 수 없습니다.
              이전 대화 내용은 열람할 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowBlockConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}
              >
                취소
              </button>
              <button
                onClick={handleBlock}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#ff3b30',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                차단하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 700
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            margin: '0 20px',
            maxWidth: 320,
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>상대방 평가하기</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              {opponent?.nickname || '상대방'}님과의 대화는 어땠나요?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 32,
                    cursor: 'pointer',
                    color: star <= selectedRating ? '#FFCC00' : '#E4E7EC',
                    transition: 'transform 0.1s'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowRatingModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveRating}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#0054CB',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 24,
          fontSize: 14,
          fontWeight: '500',
          zIndex: 800,
          pointerEvents: 'none'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

