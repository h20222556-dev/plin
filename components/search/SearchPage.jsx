'use client';

import { useState } from 'react';
import styles from './SearchPage.module.css';

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'concerts', label: '공연' },
  { id: 'posts', label: '게시물' },
  { id: 'records', label: '기록' },
  { id: 'users', label: '사용자' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [focused, setFocused] = useState(false);

  const hasQuery = query.trim().length > 0;

  // Supabase 연동 전 빈 배열 유지
  const filtered = {
    concerts: [],
    posts: [],
    records: [],
    users: [],
  };

  const totalResults = Object.values(filtered).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className={styles.page}>
      {/* Fixed Top Search Bar */}
      <div className={styles.searchHeader}>
        <div className={`${styles.searchBar} ${focused ? styles.searchBarFocused : ''}`}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="공연, 아티스트, 게시물, 사람 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Filter Chips */}
        <div className={styles.filters}>
          {FILTERS.map(f => (
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

      {/* Results */}
      <div className={styles.results}>
        {!hasQuery ? (
          <div className={styles.discover}>
            <h2 className={styles.discoverTitle}>트렌딩 🔥</h2>
            <div className={styles.trendingList}>
              {['#aespa', '#뉴진스', '#콜드플레이내한', '#BTS', '#인생공연', '#공연메이트구해요'].map((tag, i) => (
                <button
                  key={tag}
                  className={styles.trendingTag}
                  onClick={() => setQuery(tag.replace('#', ''))}
                >
                  <span className={styles.trendingRank}>{i + 1}</span>
                  <span className={styles.trendingText}>{tag}</span>
                </button>
              ))}
            </div>

            <h2 className={styles.discoverTitle} style={{ marginTop: 20 }}>추천 공연 🎤</h2>
            <div className={styles.recommendedList}>
              {[].slice(0, 3).map(c => (
                <div key={c.id} className={styles.recommendedCard}>
                  <span className={styles.recommendedEmoji}>{c.artistImage}</span>
                  <div className={styles.recommendedInfo}>
                    <p className={styles.recommendedName}>{c.artist}</p>
                    <p className={styles.recommendedDate}>{c.date}</p>
                  </div>
                  <span className={c.status === 'sold_out' ? styles.badgeSoldOut : styles.badgeUpcoming}>
                    {c.status === 'sold_out' ? '매진' : '예정'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.searchResults}>
            <p className={styles.resultCount}>"{query}" 검색 결과 {totalResults}개</p>

            {/* Concerts */}
            {(activeFilter === 'all' || activeFilter === 'concerts') && filtered.concerts.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>🎤 공연</h3>
                {filtered.concerts.map(c => (
                  <div key={c.id} className={styles.resultItem}>
                    <span className={styles.resultEmoji}>{c.artistImage}</span>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>{c.name}</p>
                      <p className={styles.resultSub}>{c.artist} · {c.date}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Posts */}
            {(activeFilter === 'all' || activeFilter === 'posts') && filtered.posts.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>💬 게시물</h3>
                {filtered.posts.map(p => (
                  <div key={p.id} className={styles.resultItem}>
                    <span className={styles.resultEmoji} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.author.avatarUrl ? (
                        <img src={p.author.avatarUrl} alt={p.author.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        p.author.profileEmoji
                      )}
                    </span>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>{p.author.nickname}</p>
                      <p className={styles.resultSub}>{p.content.slice(0, 60)}...</p>
                    </div>
                    <span className={styles.resultMeta}>❤️ {p.likes}</span>
                  </div>
                ))}
              </section>
            )}

            {/* Records */}
            {(activeFilter === 'all' || activeFilter === 'records') && filtered.records.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>🗺️ 기록</h3>
                {filtered.records.map(r => (
                  <div key={r.id} className={styles.resultItem}>
                    <span className={styles.resultEmoji}>{r.emotion || '🎵'}</span>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>{r.concertName}</p>
                      <p className={styles.resultSub}>{r.artist} · {r.date}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Users */}
            {(activeFilter === 'all' || activeFilter === 'users') && filtered.users.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>👤 사용자</h3>
                {filtered.users.map(u => (
                  <div key={u.uid} className={styles.resultItem}>
                    <span className={styles.resultEmoji} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        u.profileEmoji
                      )}
                    </span>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>{u.nickname}</p>
                      <p className={styles.resultSub}>공연 {u.concertCount}개 기록</p>
                    </div>
                    <button className={styles.followBtn}>팔로우</button>
                  </div>
                ))}
              </section>
            )}

            {totalResults === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>결과가 없어요</h3>
                <p>다른 검색어를 시도해보세요</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
