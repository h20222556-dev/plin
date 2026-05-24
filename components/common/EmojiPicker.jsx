'use client';

import 'emoji-picker-element';
import { useEffect, useRef } from 'react';

export default function EmojiPicker({ onEmojiSelect }) {
  const ref = useRef(null);

  useEffect(() => {
    const picker = ref.current;
    if (!picker) return;

    const handler = (e) => onEmojiSelect(e.detail.unicode);
    picker.addEventListener('emoji-click', handler);
    return () => picker.removeEventListener('emoji-click', handler);
  }, [onEmojiSelect]);

  return <emoji-picker ref={ref} style={{ width: '100%', maxHeight: '300px', borderRadius: '12px', overflow: 'hidden' }}></emoji-picker>;
}
