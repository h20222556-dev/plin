'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './UserProfileModal.module.css';
import { X, User, MessageCircle, Heart, MapPin, Calendar, Music, Loader } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function UserProfileModal({ user, onClose, onStartChat, isStartingChat }) {
  if (!user) return null;

  const targetUserId = user.id;

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ recordCount: 0, postCount: 0 });
  const [loadingRecords, setLoadingRecords] = useState(true);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // 채팅 차단 여부 및 평균 별점 상태 추가
  const [isChatBlocked, setIsChatBlocked] = useState(user?.is_chat_blocked || false);
  const [avgRating, setAvgRating] = useState(null);

  useEffect(() => {
    const fetchChatBlockedAndRating = async () => {

      try {
        // users 테이블에서 is_chat_blocked 상태 조회
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_chat_blocked')
          .eq('id', targetUserId)
          .single();

        if (!userError && userData) {
          setIsChatBlocked(userData.is_chat_blocked);
        }

        // user_ratings 테이블에서 평균 평점 조회
        const { data: ratingData, error: ratingError } = await supabase
          .from('user_ratings')
          .select('rating')
          .eq('rated_id', targetUserId);

        if (!ratingError && ratingData && ratingData.length > 0) {
          const avg = (ratingData.reduce((sum, r) => sum + r.rating, 0) / ratingData.length).toFixed(1);
          setAvgRating(avg);
        } else {
          setAvgRating(null);
        }
      } catch (err) {
        console.error('Error fetching chat blocked or rating:', err);
      }
    };

    fetchChatBlockedAndRating();
  }, [targetUserId]);

  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        let currentUserId = null;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          currentUserId = authUser.id;
        }

        if (!currentUserId || currentUserId === targetUserId) {
          return;
        }

        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId)
          .maybeSingle();

        setIsFollowing(!!data);
      } catch (err) {
        console.error('Check follow error:', err);
      }
    };

    checkFollowStatus();
  }, [user.id]);

  const handleFollowToggle = async () => {
    if (followLoading) return;
    setFollowLoading(true);

    try {
      let currentUserId = null;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        currentUserId = authUser.id;
      }

      if (!currentUserId) {
        alert('로그인이 필요한 기능입니다.');
        return;
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', targetUserId);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert([{
            follower_id: currentUserId,
            following_id: targetUserId
          }]);

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      alert('팔로우 처리에 실패했습니다.');
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      setLoadingRecords(true);

      try {
        const { data: recData, error: recErr } = await supabase
          .from('performances')
          .select('*')
          .eq('user_id', targetUserId)
          .eq('is_public', true)
          .order('date', { ascending: false })
          .limit(5);

        if (recErr) throw recErr;

        const formatted = (recData || []).map(r => ({
          id: r.id,
          concert_name: r.concert_name || '알 수 없는 공연',
          artist: r.artist,
          date: r.date,
          venue: r.venue
        }));
        setRecords(formatted);

        const [{ count: recCount }, { count: postCount }] = await Promise.all([
          supabase.from('performances').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId).eq('is_public', true),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId)
        ]);
        setStats({ recordCount: recCount || 0, postCount: postCount || 0 });
      } catch (err) {
        console.error('Error fetching user data:', err.message);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchUserData();
  }, [targetUserId]);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#667085" />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.profileTop}>
            <div className={styles.avatar}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.nickname} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : user.profileEmoji ? (
                <span style={{ fontSize: 32 }}>{user.profileEmoji}</span>
              ) : (
                <User size={48} color="#0054CB" />
              )}
            </div>
            <h2 className={styles.nickname}>
              {user.nickname}
              {avgRating && <span style={{ fontSize: '16px', color: '#FFCC00', marginLeft: '6px' }}>⭐ {avgRating}</span>}
            </h2>
            {!user.isPublic && <span className={styles.privateBadge}>비공개 계정</span>}
            <p className={styles.bio}>{user.bio || '음악을 사랑하는 플린이'}</p>

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stats.recordCount}</span>
                <span className={styles.statLabel}>관람 기록</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statValue}>{stats.postCount}</span>
                <span className={styles.statLabel}>작성글</span>
              </div>
            </div>
          </div>

          <div className={styles.actions} style={{ flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                className={styles.chatBtn}
                onClick={onStartChat}
                disabled={isStartingChat || isChatBlocked}
              >
                {isStartingChat ? <Loader size={18} className="spin" /> : <MessageCircle size={18} />}
                <span>채팅하기</span>
              </button>
              <button
                className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                <Heart size={18} color={isFollowing ? "#FF4B4B" : "#0054CB"} fill={isFollowing ? "#FF4B4B" : "none"} />
                <span>{followLoading ? '처리 중...' : isFollowing ? '팔로우 중' : '팔로우'}</span>
              </button>
            </div>
            {isChatBlocked && (
              <p style={{ color: '#ff3b30', fontSize: '13px', textAlign: 'center', fontWeight: '500', margin: '4px 0 0 0', width: '100%' }}>
                이 사용자는 채팅이 제한된 사용자예요.
              </p>
            )}
          </div>

          <div className={styles.recordsSection}>
            <h3 className={styles.sectionTitle}>최근 다녀온 공연</h3>
            {!user.isPublic ? (
              <div className={styles.privateState}>
                <User size={32} color="#98A2B3" />
                <p>비공개 계정입니다.</p>
                <span>팔로우하면 기록을 볼 수 있어요.</span>
              </div>
            ) : loadingRecords ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#667085' }}>불러오는 중...</div>
            ) : records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#667085' }}>아직 공개된 기록이 없습니다.</div>
            ) : (
              <div className={styles.recordList}>
                {records.map(record => (
                  <div key={record.id} className={styles.recordCard}>
                    <div className={styles.recordIcon}>
                      <Music size={20} color="#0054CB" />
                    </div>
                    <div className={styles.recordInfo}>
                      <h4 className={styles.recordName}>{record.concert_name}</h4>
                      <p className={styles.recordArtist}>{record.artist}</p>
                      <div className={styles.recordMeta}>
                        <span><Calendar size={12} /> {record.date}</span>
                        {record.venue && <span><MapPin size={12} /> {record.venue}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
