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
  const [chatRoom, setChatRoom] = useState(null);
  const { user, isDemoMode } = useAuth();

  const CHATS_TABLE = isDemoMode ? 'demo_chats' : 'chats';

  const fetchMessages = useCallback(async () => {
    const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
    if (!currentUserId || !roomId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(CHATS_TABLE)
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

      if (isDemoMode) {
        const { MOCK_CHATS } = require('@/lib/mockData');
        const mockRoom = MOCK_CHATS.find(r => r.roomId === roomId);
        if (mockRoom) {
          const merged = [...mockRoom.messages];
          dbMsgs.forEach(dbm => {
            if (!merged.some(m => m.text === dbm.text && m.senderId === dbm.senderId)) {
              merged.push(dbm);
            }
          });
          setMessages(merged);
          setExpiresAt(mockRoom.expiresAt);
          setChatRoom({
            id: mockRoom.roomId,
            user_a_id: '00000000-0000-0000-0000-000000000001',
            user_b_id: mockRoom.recipientId,
            expires_at: mockRoom.expiresAt,
            is_blocked: mockRoom.isBlocked ?? false,
            blocked_by: mockRoom.blockedBy ?? null,
            is_extended: mockRoom.isExtended ?? false,
          });
          setLoading(false);
          return;
        }
      }

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

    // chat_room 변경사항 구독 (차단 및 연장 정보 실시간 수신)
    let roomChannel;
    if (!isDemoMode) {
      roomChannel = supabase
        .channel(`chat_room_${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            const updatedRoom = payload.new;
            setChatRoom(updatedRoom);
            setExpiresAt(updatedRoom.expires_at);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (roomChannel) {
        supabase.removeChannel(roomChannel);
      }
    };
  }, [fetchMessages, roomId, CHATS_TABLE, isDemoMode]);

  const sendMessage = async (text) => {
    const currentUserId = isDemoMode ? '00000000-0000-0000-0000-000000000001' : user?.id;
    if (!currentUserId || !text.trim() || !roomId) return;

    const tempId = `temp-${Date.now()}`;
    const newMsg = {
      id: tempId,
      senderId: currentUserId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    // Optimistically add message
    setMessages(prev => [...prev, newMsg]);

    try {
      const { data, error } = await supabase
        .from(CHATS_TABLE)
        .insert([{
          room_id: roomId,
          sender_id: currentUserId,
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
      console.error(`Error sending message to ${CHATS_TABLE}:`, err.message);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      alert('메시지 전송에 실패했습니다.');
    }
  };

  return { messages, loading, expiresAt, sendMessage, chatRoom, setChatRoom };
}

