'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';
import { MOCK_CHATS } from '../mockData';

/**
 * 두 유저 사이의 채팅방 ID를 가져오거나 새로 생성합니다.
 */
export async function getOrCreateChatRoom(myId, recipientId) {
  // 데모 모드일 때는 이 함수가 직접 호출되지 않도록 UI에서 막아야 함
  const { data: existing, error: fetchError } = await supabase
    .from('chat_rooms')
    .select('id, expires_at')
    .or(`and(user_a_id.eq.${myId},user_b_id.eq.${recipientId}),and(user_a_id.eq.${recipientId},user_b_id.eq.${myId})`)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('chat_rooms')
    .insert([{ user_a_id: myId, user_b_id: recipientId }])
    .select('id, expires_at')
    .single();

  if (createError) throw createError;
  return created;
}

export function useChat(roomId, recipientId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState(null);
  const { user, isDemoMode } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (isDemoMode) {
      // 데모 모드: Mock 채팅 데이터에서 해당 방의 메시지 찾기
      const room = MOCK_CHATS.find(r => r.roomId === roomId);
      if (room) {
        setMessages(room.messages);
        setExpiresAt(room.expiresAt);
      }
      setLoading(false);
      return;
    }

    if (!user || !roomId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(
        data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          text: m.message,
          createdAt: m.created_at,
          isRead: m.is_read,
        }))
      );

      const { data: room } = await supabase
        .from('chat_rooms')
        .select('expires_at')
        .eq('id', roomId)
        .single();
      if (room) setExpiresAt(room.expires_at);
    } catch (err) {
      console.error('Error fetching messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id, isDemoMode]);

  useEffect(() => {
    fetchMessages();

    if (isDemoMode || !roomId) return;

    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new;
          setMessages(prev => [
            ...prev,
            {
              id: m.id,
              senderId: m.sender_id,
              text: m.message,
              createdAt: m.created_at,
              isRead: m.is_read,
            },
          ]);
          setExpiresAt(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, roomId, isDemoMode]);

  const sendMessage = async (text) => {
    if (isDemoMode) {
      // 데모 모드: 로컬 상태에만 추가
      const newMessage = {
        id: `mock-msg-${Date.now()}`,
        senderId: 'demo-user',
        text: text.trim(),
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      setMessages(prev => [...prev, newMessage]);
      return;
    }

    if (!user || !text.trim() || !roomId) return;

    try {
      const { error } = await supabase
        .from('chats')
        .insert([{
          room_id: roomId,
          sender_id: user.id,
          receiver_id: recipientId,
          message: text.trim(),
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err.message);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  return { messages, loading, expiresAt, sendMessage };
}
