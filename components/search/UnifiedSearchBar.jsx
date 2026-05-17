'use client';

import React from 'react';
import { Search } from 'lucide-react';
import styles from './UnifiedSearchBar.module.css';

export default function UnifiedSearchBar({ onClick }) {
  return (
    <div className={styles.container} onClick={onClick}>
      <Search size={16} className={styles.icon} />
      <span className={styles.placeholder}>공연, 아티스트, 후기, 사람 검색...</span>
    </div>
  );
}
