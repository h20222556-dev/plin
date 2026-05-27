'use client';

import { useState, useEffect } from 'react';
import { useRecords } from '@/lib/hooks/useRecords';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './ConcertsPage.module.css';
import ConcertDetailModal from './ConcertDetailModal';
import dynamic from 'next/dynamic';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar';
const AddRecordModal = dynamic(() => import('../records/AddRecordModal'), { ssr: false });
import { Search, MapPin, Calendar, CreditCard, Bookmark, Music, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SAVED_CONCERTS_KEY = 'plin_saved_concert_ids';

function loadSavedIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SAVED_CONCERTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistSavedIds(ids) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SAVED_CONCERTS_KEY, JSON.stringify([...ids]));
}

export default function ConcertsPage({ onNavigate, onOpenSearch }) {
  const [concerts, setConcerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedConcert, setSelectedConcert] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [recordContext, setRecordContext] = useState(null);

  // Saved concerts — persisted in localStorage
  const [savedIds, setSavedIds] = useState(() => loadSavedIds());

  // Sync savedIds → localStorage whenever it changes
  useEffect(() => {
    persistSavedIds(savedIds);
  }, [savedIds]);

  // Consume query from unified search modal
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__searchQuery) {
      setSearch(window.__searchQuery);
      window.__searchQuery = ''; // Consume it
    }
  }, []);

  // Fetch concerts from Supabase
  useEffect(() => {
    async function fetchConcerts() {
      try {
        setIsLoading(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from('concerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setConcerts(data || []);
      } catch (err) {
        console.error('Error fetching concerts:', err);
        setFetchError('공연 정보를 불러오지 못했습니다');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConcerts();
  }, []);
  
  // Supabase 기록 훅
  const { addRecord } = useRecords();

  const toggleSave = (id) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Keep concerts state in sync with savedIds (for detail modal bookmark display)
  const concertsWithSaved = concerts.map(c => ({ ...c, isBookmarked: savedIds.has(c.id) }));

  const filtered = concertsWithSaved.filter(c => {
    const genresStr = Array.isArray(c.genre) ? c.genre.join(', ') : (c.genre || '');
    const matchSearch = !search || 
      (c.title && c.title.toLowerCase().includes(search.toLowerCase())) || 
      (c.artist && c.artist.toLowerCase().includes(search.toLowerCase())) ||
      (genresStr && genresStr.toLowerCase().includes(search.toLowerCase()));

    const matchFilter = activeFilter === 'all' || 
      (activeFilter === 'saved' && savedIds.has(c.id)) ||
      (activeFilter === '예매중' && c.status === '예매중') ||
      (activeFilter === '공연종료' && c.status === '공연종료');
    return matchSearch && matchFilter;
  });

  const handleSaveRecord = async (data) => {
    try {
      await addRecord(data);
      alert('공연 기록이 성공적으로 저장되었습니다!');
      setIsAddingRecord(false);
    } catch (err) {
      console.error(err);
    }
  };

  const savedCount = savedIds.size;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>공연 정보</h1>
        <div className={styles.searchBarContainer}>
          <UnifiedSearchBar onClick={onOpenSearch} />
        </div>

        {/* Search Ticketing Links */}
        {search.trim() && (
          <div className={styles.searchTicketingLinks}>
            <span className={styles.searchLinksLabel}>예매처 검색:</span>
            <div className={styles.searchLinksRow}>
              <a
                href={`https://ticket.interpark.com/search?keyword=${encodeURIComponent(search.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.searchLinkBtn}
              >
                인터파크
              </a>
              <a
                href={`https://ticket.yes24.com/search?query=${encodeURIComponent(search.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.searchLinkBtn}
              >
                YES24
              </a>
              <a
                href={`https://ticket.melon.com/search/index.htm?keyword=${encodeURIComponent(search.trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.searchLinkBtn}
              >
                멜론티켓
              </a>
              <a
                href={`https://search.naver.com/search.naver?query=${encodeURIComponent(search.trim() + ' 예매')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.searchLinkBtn}
              >
                네이버 예매
              </a>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          {[
            { id: 'all', label: '전체' },
            { id: '예매중', label: '예매중' },
            { id: '공연종료', label: '공연종료' },
            { id: 'saved', label: `저장됨${savedCount > 0 ? ` ${savedCount}` : ''}` },
          ].map(f => (
            <button
              key={f.id}
              className={`chip ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.id === 'saved' && <Bookmark size={12} style={{ marginRight: 4 }} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Saved empty hint */}
        {activeFilter === 'saved' && savedCount === 0 && (
          <div className={styles.savedEmptyHint}>
            <Bookmark size={16} color="#98A2B3" style={{ marginRight: 6 }} />
            <span>북마크 버튼을 눌러 공연을 저장해보세요</span>
          </div>
        )}
      </div>

      {/* Concert List */}
      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>공연 정보를 불러오는 중입니다...</p>
          </div>
        ) : fetchError ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{fetchError}</p>
          </div>
        ) : (
          <div className="stagger">
            {filtered.map(concert => {
              const genres = Array.isArray(concert.genre)
                ? concert.genre
                : (typeof concert.genre === 'string' ? concert.genre.split(',').map(g => g.trim()) : []);

              return (
                <div key={concert.id} className={styles.concertCard}>
                  {/* Status badge */}
                  <div className={styles.cardTop}>
                    <span className={concert.status === '공연종료' ? styles.badgeSoldOut : styles.badgeUpcoming}>
                      {concert.status}
                    </span>
                    <button
                      id={`save-btn-${concert.id}`}
                      className={`${styles.bookmarkBtn} ${savedIds.has(concert.id) ? styles.bookmarkBtnActive : ''}`}
                      onClick={() => toggleSave(concert.id)}
                      aria-label={savedIds.has(concert.id) ? '저장 취소' : '저장'}
                      title={savedIds.has(concert.id) ? '저장 취소' : '공연 저장'}
                    >
                      <Bookmark 
                        size={24} 
                        fill={savedIds.has(concert.id) ? '#0054CB' : 'none'} 
                        color={savedIds.has(concert.id) ? '#0054CB' : '#98A2B3'} 
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
                        <h3 className={styles.concertName}>{concert.title}</h3>
                        <p className={styles.artistName}>{concert.artist}</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className={styles.details}>
                      <div className={styles.detailItem}>
                        <Calendar size={16} color="#667085" />
                        <span>{concert.date}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <MapPin size={16} color="#667085" />
                        <span>{concert.venue}</span>
                      </div>
                    </div>

                    {/* Genre */}
                    <div className={styles.cardBottom}>
                      <div className={styles.genres}>
                        {genres.map(g => (
                          <span key={g} className={styles.genreChip}>{g}</span>
                        ))}
                      </div>
                    </div>
                  </button>

                  {/* Action buttons */}
                  <div className={styles.cardActions}>
                    {concert.status === '공연종료' ? (
                      <div className={styles.endedBadge}>공연종료</div>
                    ) : (
                      <button
                        className={styles.ticketBtn}
                        disabled={concert.status !== '예매중' || !concert.ticket_url}
                        onClick={() => {
                          if (concert.status === '예매중' && concert.ticket_url) {
                            window.open(concert.ticket_url, '_blank');
                          }
                        }}
                      >
                        예매하기
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !fetchError && filtered.length === 0 && (
          <div className="empty-state">
            {activeFilter === 'saved' ? (
              <>
                <Bookmark size={48} color="#D0D5DD" />
                <h3>저장된 공연이 없어요</h3>
                <p>공연 카드의 북마크 버튼을 눌러 저장해보세요</p>
              </>
            ) : (
              <>
                <Search size={48} color="#98A2B3" />
                <h3>공연을 찾을 수 없어요</h3>
                <p>데이터가 존재하지 않습니다</p>
              </>
            )}
          </div>
        )}
      </div>

      {selectedConcert && (
        <ConcertDetailModal
          concert={selectedConcert}
          onClose={() => setSelectedConcert(null)}
          onBookmark={() => toggleSave(selectedConcert.id)}
          onNavigate={onNavigate}
          onAddRecord={(concert) => {
            setRecordContext({
              ...concert,
              concertName: concert.title || '',
              name: concert.title || '',
              genre: Array.isArray(concert.genre) ? concert.genre : (typeof concert.genre === 'string' ? concert.genre.split(',').map(s => s.trim()) : [])
            });
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

