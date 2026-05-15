'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

/**
 * 두 유저 사이의 채팅방 ID를 가져오거나 새로 생성합니다.
 * RLS 정책: user_a_id 또는 user_b_id가 auth.uid()여야 합니다.
 */
export async function getOrCreateChatRoom(myId, recipientId) {
  // 기존 채팅방 조회 (두 유저 중 어느 쪽이 a/b여도 됨)
  const { data: existing, error: fetchError } = await supabase
    .from('chat_rooms')
    .select('id, expires_at')
    .or(`and(user_a_id.eq.${myId},user_b_id.eq.${recipientId}),and(user_a_id.eq.${recipientId},user_b_id.eq.${myId})`)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  // 없으면 새로 생성
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
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
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

      // 채팅방 만료 시간 가져오기
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
  }, [roomId, user?.id]);

  useEffect(() => {
    fetchMessages();

    if (!roomId) return;

    // 실시간 구독: 새 메시지 수신
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
          // 만료 시간도 갱신 (트리거가 DB에서 처리하므로 UI도 +3일로 설정)
          setExpiresAt(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, roomId]);

  const sendMessage = async (text) => {
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
