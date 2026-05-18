'use client';

import React, { useEffect, useRef } from 'react';
import { X, Search, MapPin, Music, MessageCircle, User, Calendar, ExternalLink } from 'lucide-react';
import styles from './SearchModal.module.css';
import { useUnifiedSearch } from '@/lib/hooks/useUnifiedSearch';
import { useRecords } from '@/lib/hooks/useRecords';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function SearchModal({ isOpen, onClose, onNavigate }) {
  const { query, setQuery, results, loading } = useUnifiedSearch();
  const { setFocusedRecord } = useRecords();
  const { user, isDemoMode } = useAuth();
  const router = useRouter();
  const inputRef = useRef(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasQuery = query.trim().length > 0;
  const totalResults = results.records.length + results.concerts.length + results.posts.length + results.users.length;

  const handleRecordClick = (record) => {
    setFocusedRecord(record);
    onNavigate('records');
    onClose();
  };

  const handleConcertClick = (concert) => {
    // Navigate to concerts tab and pre-fill search query
    window.__searchQuery = concert.name;
    onNavigate('concerts');
    onClose();
  };

  const handleCommunityClick = () => {
    onNavigate('community');
    onClose();
  };

  const handleSearchUserClick = async (selectedUser) => {
    if (!selectedUser) return;
    
    let currentUserId = null;
    if (isDemoMode) {
      currentUserId = 'demo_user';
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        currentUserId = authUser.id;
      }
    }

    if (!currentUserId) {
      router.push('/login');
      return;
    }

    if (selectedUser.id === currentUserId) {
      // 자기 자신을 클릭한 경우
      router.push('/profile/settings');
    } else {
      // 다른 유저를 클릭한 경우
      router.push(`/profile/${selectedUser.id}`);
    }
    onClose();
  };

  const handleMoreClick = (tabId) => {
    window.__searchQuery = query;
    onNavigate(tabId);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        {/* Header Search Bar */}
        <div className={styles.header}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              className={styles.searchInput}
              placeholder="공연, 아티스트, 후기, 사람 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {query && (
              <button className={styles.clearBtn} onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            취소
          </button>
        </div>

        {/* Search Results Area */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>검색 결과를 찾는 중...</p>
            </div>
          ) : !hasQuery ? (
            <div className={styles.discover}>
              <h3 className={styles.discoverTitle}>인기 태그 🔥</h3>
              <div className={styles.trendingList}>
                {['아이브', '아이유', '세븐틴', '콘서트후기', '인생공연', '내한공연'].map((tag) => (
                  <button
                    key={tag}
                    className={styles.trendingTag}
                    onClick={() => setQuery(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>검색 결과가 없어요</h3>
              <p>다른 검색어를 입력해 보세요.</p>
            </div>
          ) : (
            <div className={styles.resultsList}>
              {/* 1. 지도 기록 (Records) */}
              {results.records.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>🗺️ 지도 기록 ({results.records.length})</h3>
                    {results.records.length > 3 && (
                      <button className={styles.moreBtn} onClick={() => handleMoreClick('records')}>
                        더보기
                      </button>
                    )}
                  </div>
                  <div className={styles.sectionGrid}>
                    {results.records.slice(0, 3).map((r) => (
                      <div key={r.id} className={styles.resultCard} onClick={() => handleRecordClick(r)}>
                        <span className={styles.emojiBadge}>{r.emotion}</span>
                        <div className={styles.cardInfo}>
                          <h4 className={styles.cardTitle}>{r.concertName}</h4>
                          <p className={styles.cardSubtitle}>{r.artist} · {r.venue}</p>
                          <span className={styles.cardMeta}>{r.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2. 공연 목록 (Concerts) */}
              {results.concerts.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>🎤 공연 ({results.concerts.length})</h3>
                    {results.concerts.length > 3 && (
                      <button className={styles.moreBtn} onClick={() => handleMoreClick('concerts')}>
                        더보기
                      </button>
                    )}
                  </div>
                  <div className={styles.sectionGrid}>
                    {results.concerts.slice(0, 3).map((c) => (
                      <div key={c.id} className={styles.concertResultCard}>
                        <div className={styles.concertMainInfo} onClick={() => handleConcertClick(c)}>
                          <span className={styles.emojiBadge}>🎤</span>
                          <div className={styles.cardInfo}>
                            <h4 className={styles.cardTitle}>{c.name}</h4>
                            <p className={styles.cardSubtitle}>{c.artist} · {c.venue}</p>
                            <span className={styles.cardMeta}>{c.date}</span>
                          </div>
                        </div>

                        {/* Direct Ticketing Links */}
                        <div className={styles.ticketingRow}>
                          <a
                            href={`https://ticket.interpark.com/search?keyword=${encodeURIComponent(c.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.ticketLink}
                          >
                            인터파크 <ExternalLink size={12} />
                          </a>
                          <a
                            href={`https://ticket.yes24.com/search?query=${encodeURIComponent(c.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.ticketLink}
                          >
                            YES24 <ExternalLink size={12} />
                          </a>
                          <a
                            href={`https://ticket.melon.com/search/index.htm?keyword=${encodeURIComponent(c.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.ticketLink}
                          >
                            멜론티켓 <ExternalLink size={12} />
                          </a>
                          <a
                            href={`https://search.naver.com/search.naver?query=${encodeURIComponent(c.name + ' 예매')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.ticketLink}
                          >
                            네이버 <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. 커뮤니티 (Community Posts) */}
              {results.posts.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>💬 커뮤니티 ({results.posts.length})</h3>
                    {results.posts.length > 3 && (
                      <button className={styles.moreBtn} onClick={() => handleMoreClick('community')}>
                        더보기
                      </button>
                    )}
                  </div>
                  <div className={styles.sectionGrid}>
                    {results.posts.slice(0, 3).map((p) => (
                      <div key={p.id} className={styles.resultCard} onClick={handleCommunityClick}>
                        <span className={styles.profileEmojiBadge}>{p.author.profileEmoji}</span>
                        <div className={styles.cardInfo}>
                          <div className={styles.authorRow}>
                            <span className={styles.authorName}>{p.author.nickname}</span>
                            <span className={styles.postEmotion}>{p.emotion}</span>
                          </div>
                          <p className={styles.postBody}>{p.content}</p>
                          <div className={styles.postMetaRow}>
                            <span>❤️ {p.likes}</span>
                            <span>·</span>
                            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. 프로필 사용자 (Users) */}
              {results.users.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>👤 프로필 ({results.users.length})</h3>
                    {results.users.length > 3 && (
                      <button className={styles.moreBtn} onClick={() => handleMoreClick('profile')}>
                        더보기
                      </button>
                    )}
                  </div>
                  <div className={styles.sectionGrid}>
                    {results.users.slice(0, 3).map((u) => (
                      <div key={u.id} className={styles.resultCard} onClick={() => handleSearchUserClick(u)}>
                        <span className={styles.profileEmojiBadge}>{u.profileEmoji}</span>
                        <div className={styles.cardInfo}>
                          <h4 className={styles.cardTitle}>{u.nickname}</h4>
                          <p className={styles.cardSubtitle}>PLIN 회원</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
