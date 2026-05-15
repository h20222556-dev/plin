'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './useAuth';

export function useChat(chatId, recipientId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !chatId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .eq('room_id', chatId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formatted = data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          text: m.message,
          createdAt: m.created_at,
          isRead: m.is_read
        }));
        setMessages(formatted);
      } catch (err) {
        console.error('Error fetching messages:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats', filter: `room_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            senderId: newMsg.sender_id,
            text: newMsg.message,
            createdAt: newMsg.created_at,
            isRead: newMsg.is_read
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user]);

  const sendMessage = async (text) => {
    if (!user || !text.trim()) return;

    try {
      const { error } = await supabase
        .from('chats')
        .insert([{
          room_id: chatId,
          sender_id: user.id,
          receiver_id: recipientId,
          message: text.trim()
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err.message);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  return { messages, loading, sendMessage };
}
