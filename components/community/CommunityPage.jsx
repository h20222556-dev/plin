'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCommunity } from '@/lib/hooks/useCommunity';
import { useAuth } from '@/lib/hooks/useAuth';
import { getOrCreateChatRoom } from '@/lib/hooks/useChat';
import styles from './CommunityPage.module.css';
import PostCard from './PostCard';
import ChatList from './ChatList';
import ChatModal from './ChatModal';
import NewPostModal from './NewPostModal';
import UserProfileModal from './UserProfileModal';
import PostDetailModal from './PostDetailModal';
import { Search, Hash } from 'lucide-react';

const TABS = [
  { id: 'feed', label: '피드' },
  { id: 'chats', label: '채팅' },
];

export default function CommunityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('feed');
  const { posts, loading, createPost, toggleLike, deletePost: deletePostFn } = useCommunity();
  const { user } = useAuth();
  const [showNewPost, setShowNewPost] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // { roomId, recipientId, recipientNickname, expiresAt }
  const [selectedUser, setSelectedUser] = useState(null);
  const [startingChat, setStartingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const pendingChat = sessionStorage.getItem('pendingChatRoom');
    if (pendingChat) {
      try {
        const chatData = JSON.parse(pendingChat);
        setActiveChat(chatData);
        setActiveTab('chats');
      } catch (e) {
        console.error(e);
      } finally {
        sessionStorage.removeItem('pendingChatRoom');
      }
    }
  }, []);

  const handleStartChat = async (targetUser) => {
    // Allow chatting in demo mode
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (user.id === targetUser.id) {
      alert('자기 자신과 채팅할 수 없습니다.');
      return;
    }
    setStartingChat(true);
    try {
      const room = await getOrCreateChatRoom(user.id, targetUser.id);
      setSelectedUser(null);
      setActiveChat({
        roomId: room.id,
        recipientId: targetUser.id,
        recipientNickname: targetUser.nickname,
        expiresAt: room.expires_at,
      });
      setActiveTab('chats');
    } catch (err) {
      console.error('채팅방 생성 실패:', err.message);
      alert('채팅을 시작하지 못했습니다.');
    } finally {
      setStartingChat(false);
    }
  };

  // Compute filtered posts based on search query
  const trimmedQuery = searchQuery.trim();
  const isHashtagSearch = trimmedQuery.startsWith('#');
  const hashtagTerm = isHashtagSearch ? trimmedQuery.slice(1).toLowerCase() : '';

  const filteredPosts = (posts ?? []).filter(post => {
    if (!trimmedQuery) return true;
    if (isHashtagSearch) {
      // Case-insensitive match against tags array
      return (post.tags ?? []).some(tag => tag.toLowerCase() === hashtagTerm);
    }
    // Plain text search in content
    return post.content.toLowerCase().includes(trimmedQuery.toLowerCase());
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>커뮤니티</h1>
          {activeTab === 'feed' && (
            <button className={styles.writeBtn} onClick={() => setShowNewPost(true)}>
              글쓰기
            </button>
          )}
        </div>

        {/* Sub tabs */}
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search bar — only in feed tab */}
        {activeTab === 'feed' && (
          <div className={styles.searchContainer}>
            <div className={styles.searchBar}>
              {isHashtagSearch ? (
                <Hash size={16} className={styles.searchIcon} />
              ) : (
                <Search size={16} className={styles.searchIcon} />
              )}
              <input
                id="community-search-input"
                className={styles.searchInput}
                placeholder="#BTS 또는 키워드 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className={styles.searchClearBtn}
                  onClick={() => setSearchQuery('')}
                  aria-label="검색 초기화"
                >
                  ✕
                </button>
              )}
            </div>
            {isHashtagSearch && hashtagTerm && (
              <div className={styles.hashtagBadge}>
                <Hash size={12} />
                <span>{hashtagTerm}</span>
                <span className={styles.hashtagResultCount}>
                  {filteredPosts.length}개 결과
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feed */}
      {activeTab === 'feed' && (
        <div className={styles.feed}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>불러오는 중...</div>
          ) : filteredPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#667085' }}>
              {trimmedQuery ? (
                <>
                  <Search size={36} color="#D0D5DD" style={{ marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>
                    {isHashtagSearch ? `#${hashtagTerm}` : `"${trimmedQuery}"`} 검색 결과가 없어요
                  </p>
                  <p style={{ fontSize: 13 }}>다른 키워드로 검색해보세요</p>
                </>
              ) : (
                <>아직 작성된 글이 없습니다.<br />첫 번째 글을 남겨보세요! 🎵</>
              )}
            </div>
          ) : (
            <div className="stagger">
              {filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => toggleLike(post.id, post.likes, post.isLiked)}
                  onAuthorClick={(author) => router.push(`/profile/${author.id}`)}
                  deletePost={deletePostFn}
                  onPostClick={(post) => setSelectedPost(post)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chats — 채팅 목록 (현재 채팅방이 열려 있지 않을 때) */}
      {activeTab === 'chats' && !activeChat && (
        <ChatList onOpenChat={setActiveChat} />
      )}

      {/* New Post Modal */}
      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onPost={async (postData) => {
            await createPost(postData.content, postData.tags, postData.emotion, postData.performanceId, postData.images);
            setShowNewPost(false);
          }}
        />
      )}

      {/* Chat Modal */}
      {activeChat && (
        <ChatModal chat={activeChat} onClose={() => setActiveChat(null)} />
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStartChat={() => handleStartChat(selectedUser)}
          isStartingChat={startingChat}
        />
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={toggleLike}
        />
      )}
    </div>
  );
}

