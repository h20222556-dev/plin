'use client';

import { useState } from 'react';
import { useRecords } from '@/lib/hooks/useRecords';
import { useAuth } from '@/lib/hooks/useAuth';
import { MOCK_PERFORMANCES } from '@/lib/mockData';
import styles from './ConcertsPage.module.css';
import ConcertDetailModal from './ConcertDetailModal';
import dynamic from 'next/dynamic';
const AddRecordModal = dynamic(() => import('../records/AddRecordModal'), { ssr: false });
import { Search, MapPin, Calendar, CreditCard, Bookmark, Music, ChevronRight } from 'lucide-react';

export default function ConcertsPage({ onNavigate }) {
  const { isDemoMode } = useAuth();
  // 데모 모드일 경우 Mock 데이터 사용
  const [concerts, setConcerts] = useState(isDemoMode ? MOCK_PERFORMANCES : []);
  const [selectedConcert, setSelectedConcert] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordContext, setRecordContext] = useState(null);
  
  // Supabase 기록 훅
  const { addRecord } = useRecords();

  const toggleBookmark = (id) => {
    setConcerts(prev => prev.map(c => c.id === id ? { ...c, isBookmarked: !c.isBookmarked } : c));
  };

  const filtered = concerts.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.artist.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'all' || 
      (activeFilter === 'bookmarked' && c.isBookmarked) ||
      (activeFilter === 'upcoming' && c.status === 'upcoming') ||
      (activeFilter === 'soldout' && c.status === 'sold_out');
    return matchSearch && matchFilter;
  });

  const handleSaveRecord = async (data) => {
    try {
      await addRecord(data);
      alert('공연 기록이 성공적으로 저장되었습니다!');
      setIsAddingRecord(false);
    } catch (err) {
      // 에러 처리는 addRecord 내에서 기본적으로 알림을 띄웁니다.
      console.error(err);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>공연 정보</h1>
        <div className={styles.searchBar}>
          <Search size={20} color="#667085" />
          <input
            className={styles.searchInput}
            placeholder="공연명, 아티스트 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          {[
            { id: 'all', label: '전체' },
            { id: 'upcoming', label: '예정' },
            { id: 'bookmarked', label: '찜한 공연' },
            { id: 'soldout', label: '매진' },
          ].map(f => (
            <button
              key={f.id}
              className={`chip ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Concert List */}
      <div className={styles.list}>
        <div className="stagger">
          {filtered.map(concert => (
            <div key={concert.id} className={styles.concertCard}>
              {/* Status badge */}
              <div className={styles.cardTop}>
                <span className={concert.status === 'sold_out' ? styles.badgeSoldOut : styles.badgeUpcoming}>
                  {concert.status === 'sold_out' ? '매진' : '예정'}
                </span>
                <button
                  className={styles.bookmarkBtn}
                  onClick={() => toggleBookmark(concert.id)}
                >
                  <Bookmark 
                    size={24} 
                    fill={concert.isBookmarked ? '#0054CB' : 'none'} 
                    color={concert.isBookmarked ? '#0054CB' : '#98A2B3'} 
                  />
                </button>
              </div>

              <button
                className={styles.cardMain}
                onClick={() => setSelectedConcert(concert)}
              >
                {/* Artist info */}
                <div className={styles.artistArea}>
                  <div className={styles.artistSymbol}>
                    <Music size={24} color="#667085" />
                  </div>
                  <div className={styles.artistInfo}>
                    <h3 className={styles.concertName}>{concert.name}</h3>
                    <p className={styles.artistName}>{concert.artist}</p>
                  </div>
                </div>

                {/* Details */}
                <div className={styles.details}>
                  <div className={styles.detailItem}>
                    <Calendar size={16} color="#667085" />
                    <span>{concert.date} {concert.time}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <MapPin size={16} color="#667085" />
                    <span>{concert.venue}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <CreditCard size={16} color="#667085" />
                    <span>{concert.price}</span>
                  </div>
                </div>

                {/* Genre + review */}
                <div className={styles.cardBottom}>
                  <div className={styles.genres}>
                    {concert.genre.map(g => (
                      <span key={g} className={styles.genreChip}>{g}</span>
                    ))}
                  </div>
                  {concert.reviewCount > 0 && (
                    <span className={styles.reviewCount}>후기 {concert.reviewCount}개</span>
                  )}
                </div>
              </button>

              {/* Action buttons */}
              <div className={styles.cardActions}>
                <a
                  href={concert.ticketingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.ticketBtn}
                  onClick={e => concert.status === 'sold_out' && e.preventDefault()}
                >
                  {concert.status === 'sold_out' ? '매진' : '예매하기'}
                </a>
                {concert.reviewCount > 0 && (
                  <button className={styles.reviewBtn}>
                    <span>후기 보러가기</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <Search size={48} color="#98A2B3" />
            <h3>공연을 찾을 수 없어요</h3>
            <p>데이터가 존재하지 않습니다</p>
          </div>
        )}
      </div>

      {selectedConcert && (
        <ConcertDetailModal
          concert={selectedConcert}
          onClose={() => setSelectedConcert(null)}
          onBookmark={() => toggleBookmark(selectedConcert.id)}
          onNavigate={onNavigate}
          onAddRecord={(concert) => {
            setRecordContext(concert);
            setIsAddingRecord(true);
          }}
        />
      )}

      {isAddingRecord && (
        <AddRecordModal
          initialData={recordContext}
          onClose={() => setIsAddingRecord(false)}
          onSave={handleSaveRecord}
        />
      )}
    </div>
  );
}
