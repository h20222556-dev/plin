'use client';

import { useState } from 'react';
import { mockChats } from '@/lib/mockData';
import { useCommunity } from '@/lib/hooks/useCommunity';
import styles from './CommunityPage.module.css';
import PostCard from './PostCard';
import ChatList from './ChatList';
import ChatModal from './ChatModal';
import NewPostModal from './NewPostModal';
import UserProfileModal from './UserProfileModal';

const TABS = [
  { id: 'feed', label: '피드' },
  { id: 'chats', label: '채팅' },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('feed');
  const { posts, loading, createPost, toggleLike } = useCommunity();
  const [chats] = useState(mockChats);
  const [showNewPost, setShowNewPost] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

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
              {t.id === 'chats' && chats.some(c => c.unread > 0) && (
                <span className={styles.unreadBadge}>
                  {chats.reduce((sum, c) => sum + c.unread, 0)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {activeTab === 'feed' && (
        <div className={styles.feed}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#667085' }}>아직 작성된 글이 없습니다.</div>
          ) : (
            <div className="stagger">
              {posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onLike={() => toggleLike(post.id, post.likes, post.isLiked)} 
                  onAuthorClick={(author) => setSelectedUser(author)}
                  onDelete={deletePost}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chats */}
      {activeTab === 'chats' && (
        <ChatList chats={chats} onOpenChat={setActiveChat} />
      )}

      {/* New Post Modal */}
      {showNewPost && (
        <NewPostModal
          onClose={() => setShowNewPost(false)}
          onPost={async (post) => {
            await createPost(post.content, post.tags, null);
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
          onStartChat={() => {
            // Logic to start chat with user
            setSelectedUser(null);
            setActiveTab('chats');
            // Assuming mock chat is created or opened
            setActiveChat({
              id: `chat_new_${Date.now()}`,
              participants: [selectedUser.nickname],
              lastMessage: '채팅을 시작합니다.',
              unread: 0,
            });
          }}
        />
      )}
    </div>
  );
}
