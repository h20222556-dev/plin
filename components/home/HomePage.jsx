'use client';

import { useState, useRef, useEffect } from 'react';
import { useRecords } from '@/lib/hooks/useRecords';
import styles from './HomePage.module.css';
import { Search, Music, Calendar, Hash, ChevronRight } from 'lucide-react';

const POPULAR_TAGS = ['인생공연', '떼창', '내한공연', '첫콘', '막콘', '무대인사'];

export default function HomePage({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  
  // Supabase 기록 불러오기
  const { records, loading } = useRecords();

  // 모크 콘서트 대체 빈 배열
  const recommendedConcerts = [];

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTagClick = (tag) => {
    setSearch(tag);
    setIsSearchFocused(false);
    // In a real app, you would trigger a search action here
    console.log('Searching for:', tag);
  };

  return (
    <div className={styles.page}>
      {/* Header with Search */}
      <header className={styles.header}>
        <div className={styles.searchContainer} ref={searchContainerRef}>
          <div className={`${styles.searchBar} ${isSearchFocused ? styles.searchBarFocused : ''}`}>
            <Search size={20} color={isSearchFocused ? '#0054CB' : '#667085'} />
            <input
              type="text"
              placeholder="공연명, 아티스트 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className={styles.searchInput}
            />
          </div>
          
          {/* Search Dropdown / Popular Tags */}
          {isSearchFocused && (
            <div className={styles.searchDropdown}>
              <h3 className={styles.dropdownTitle}>🔥 인기 태그</h3>
              <div className={styles.tagList}>
                {POPULAR_TAGS.map((tag) => (
                  <button 
                    key={tag} 
                    className={styles.dropdownTag}
                    onClick={() => handleTagClick(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Music size={24} color="#0054CB" />
            <h2 className={styles.sectionTitle}>추천 공연</h2>
          </div>
          <div className={styles.horizontalScroll}>
            {recommendedConcerts.length > 0 ? (
              recommendedConcerts.slice(0, 5).map((concert) => (
                <button 
                  key={concert.id} 
                  className={styles.concertCard}
                  onClick={() => onNavigate('concerts')}
                >
                  <div className={styles.artistSymbol}>
                    <Music size={48} color="#EAECF0" />
                  </div>
                  <div className={styles.concertInfo}>
                    <h3 className={styles.concertName}>{concert.name}</h3>
                    <p className={styles.artistName}>{concert.artist}</p>
                  </div>
                </button>
              ))
            ) : (
              <p style={{ color: '#98A2B3', fontSize: '14px', padding: '16px 0' }}>예정된 공연이 없습니다.</p>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeaderClickable} onClick={() => onNavigate('profile')}>
            <div className={styles.sectionHeaderLeft}>
              <Calendar size={24} color="#0054CB" />
              <h2 className={styles.sectionTitle}>최근 나의 기록</h2>
            </div>
            <ChevronRight size={20} color="#667085" />
          </div>
          <div className={styles.recordList}>
            {loading ? (
               <p style={{ color: '#98A2B3', fontSize: '14px' }}>기록을 불러오는 중...</p>
            ) : records.length > 0 ? (
              records.slice(0, 3).map((record) => (
                <button 
                  key={record.id} 
                  className={styles.recordItem}
                  onClick={() => onNavigate('profile')}
                >
                  <div className={styles.recordSymbol}>
                     <Calendar size={24} color="#0054CB" />
                  </div>
                  <div className={styles.recordInfo}>
                    <h3 className={styles.recordTitle}>{record.concertName}</h3>
                    <p className={styles.recordDate}>{record.date}</p>
                  </div>
                </button>
              ))
            ) : (
              <p style={{ color: '#98A2B3', fontSize: '14px', padding: '16px 0' }}>저장된 공연 기록이 없습니다.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
