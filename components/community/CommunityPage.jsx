'use client';

import { useState } from 'react';
import { useCommunity } from '@/lib/hooks/useCommunity';
import { useAuth } from '@/lib/hooks/useAuth';
import { getOrCreateChatRoom } from '@/lib/hooks/useChat';
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
const { posts, loading, createPost, toggleLike, deletePost: deletePostFn, isDemoMode } = useCommunity();
  const { user } = useAuth();
  const [showNewPost, setShowNewPost] = useState(false);
  const [activeChat, setActiveChat] = useState(null); // { roomId, recipientId, recipientNickname, expiresAt }
  const [selectedUser, setSelectedUser] = useState(null);
  const [startingChat, setStartingChat] = useState(false);

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
      </div>

      {/* Feed */}
      {activeTab === 'feed' && (
        <div className={styles.feed}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>불러오는 중...</div>
          ) : (posts ?? []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#667085' }}>
              아직 작성된 글이 없습니다.<br />첫 번째 글을 남겨보세요! 🎵
            </div>
          ) : (
            <div className="stagger">
              {(posts ?? []).map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={() => toggleLike(post.id, post.likes, post.isLiked)}
                  onAuthorClick={(author) => setSelectedUser(author)}
                  deletePost={deletePostFn}
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
            await createPost(postData.content, postData.tags, postData.emotion, postData.performanceId);
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
    </div>
  );
}
