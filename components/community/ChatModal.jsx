'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { useAuth } from '@/lib/hooks/useAuth';
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
export default function ChatModal({ chat, onClose }) {
  const { user } = useAuth();
  const { messages, loading, expiresAt, sendMessage } = useChat(chat.roomId, chat.recipientId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  const getTimeLeft = () => {
    const target = expiresAt || chat.expiresAt;
    if (!target) return '3일 후 삭제';
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return '만료됨';
    const hr = Math.floor(diff / 3600000);
    if (hr < 24) return `${hr}시간 후 삭제`;
    return `${Math.floor(hr / 24)}일 후 삭제`;
  };

  const nickname = chat.recipientNickname || '알 수 없는 사용자';

  return (
    <div className={styles.overlay}>
      <div className={styles.chatContainer}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>
            <ChevronLeft size={24} color="#101828" />
          </button>

          <div className={styles.headerCenter}>
            <div className={styles.avatar}>
              <User size={18} color="#0054CB" />
            </div>
            <div>
              <h3 className={styles.name}>{nickname}</h3>
              <div className={styles.timer}>
                <Clock size={12} />
                <span>{getTimeLeft()}</span>
              </div>
            </div>
          </div>

          <button className={styles.menuBtn}>
            <MoreVertical size={20} color="#667085" />
          </button>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          <div className={styles.ephemeralNotice}>
            <Info size={14} color="#0054CB" style={{ flexShrink: 0 }} />
            <span>이 대화는 마지막 메시지로부터 3일 후 자동 삭제됩니다. 서로를 존중하는 따뜻한 대화를 나눠주세요.</span>
          </div>

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
                        <User size={14} color="#0054CB" />
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
        <div className={styles.inputArea}>
          <div className={styles.inputContainer}>
            <input
              className={styles.input}
              placeholder="메시지를 입력하세요..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
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
      </div>
    </div>
  );
}
