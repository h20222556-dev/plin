'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

/**
 * 두 유저 사이의 채팅방 ID를 가져오거나 새로 생성합니다.
 */
export async function getOrCreateChatRoom(myId, recipientId) {
  // 데모 모드일 때는 recipientId가 'demo_user_2' 등일 수 있음
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

  const CHATS_TABLE = isDemoMode ? 'demo_chats' : 'chats';

  const fetchMessages = useCallback(async () => {
    const currentUserId = isDemoMode ? 'demo_user' : user?.id;
    if (!currentUserId || !roomId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(CHATS_TABLE)
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

      // 채팅방 만료 시간 (chat_rooms 테이블은 공용으로 가정)
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('expires_at')
        .eq('id', roomId)
        .single();
      if (room) setExpiresAt(room.expires_at);
    } catch (err) {
      console.error(`Error fetching messages from ${CHATS_TABLE}:`, err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id, isDemoMode, CHATS_TABLE]);

  useEffect(() => {
    fetchMessages();

    if (!roomId) return;

    const channel = supabase
      .channel(`chat_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: CHATS_TABLE, filter: `room_id=eq.${roomId}` },
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
  }, [fetchMessages, roomId, CHATS_TABLE]);

  const sendMessage = async (text) => {
    const currentUserId = isDemoMode ? 'demo_user' : user?.id;
    if (!currentUserId || !text.trim() || !roomId) return;

    try {
      const { error } = await supabase
        .from(CHATS_TABLE)
        .insert([{
          room_id: roomId,
          sender_id: currentUserId,
          receiver_id: recipientId,
          message: text.trim(),
        }]);

      if (error) throw error;
    } catch (err) {
      console.error(`Error sending message to ${CHATS_TABLE}:`, err.message);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  return { messages, loading, expiresAt, sendMessage };
}
