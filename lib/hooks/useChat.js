'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

/**
 * 두 유저 사이의 채팅방 ID를 가져오거나 새로 생성합니다.
 */
export async function getOrCreateChatRoom(myId, recipientId) {
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
  const [chatRoom, setChatRoom] = useState(null);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!user?.id || !roomId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dbMsgs = data.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        text: m.message,
        createdAt: m.created_at,
        isRead: m.is_read,
      }));

      setMessages(dbMsgs);

      // 채팅방 만료 시간 및 차단/연장 정보
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      if (room) {
        setChatRoom(room);
        setExpiresAt(room.expires_at);
      }
    } catch (err) {
      console.error('Error fetching messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id]);

  useEffect(() => {
    fetchMessages();

    if (!roomId) return;

    const channelName = `chat_${roomId}`;
    const existingChannel = supabase.channel(channelName);
    supabase.removeChannel(existingChannel);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const m = payload.new;
          setMessages(prev => {
            if (prev.some(msg => msg.id === m.id)) {
              return prev;
            }
            return [
              ...prev,
              {
                id: m.id,
                senderId: m.sender_id,
                text: m.message,
                createdAt: m.created_at,
                isRead: m.is_read,
              },
            ];
          });
          setExpiresAt(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, roomId]);

  const sendMessage = async (text) => {
    if (!user?.id || !text.trim() || !roomId) return;

    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      id: tempId,
      senderId: user.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    // Optimistically add message
    setMessages(prev => [...prev, newMsg]);

    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([{
          room_id: roomId,
          sender_id: user.id,
          receiver_id: recipientId,
          message: text.trim(),
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        const dbMsg = data[0];
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempId
              ? {
                  id: dbMsg.id,
                  senderId: dbMsg.sender_id,
                  text: dbMsg.message,
                  createdAt: dbMsg.created_at,
                  isRead: dbMsg.is_read,
                }
              : msg
          )
        );
      }
    } catch (err) {
      console.error('Error sending message:', err.message);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert('메시지 전송에 실패했습니다.');
    }
  };

  return { messages, loading, expiresAt, sendMessage, chatRoom, setChatRoom };
}
