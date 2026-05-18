'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './UserProfileModal.module.css';
import { X, User, MessageCircle, Heart, MapPin, Calendar, Music, Loader } from 'lucide-react';

export default function UserProfileModal({ user, onClose, onStartChat, isStartingChat }) {
  if (!user) return null;

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ recordCount: 0, postCount: 0 });
  const [loadingRecords, setLoadingRecords] = useState(true);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      try {
        let currentUserId = null;
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          currentUserId = authUser.id;
        }

        if (!currentUserId || user.id === 'demo_user' || currentUserId === 'demo_user') {
          return;
        }

        const { data } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('following_id', user.id)
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

      if (user.id === 'demo_user' || currentUserId === 'demo_user') {
        setIsFollowing(prev => !prev);
        setFollowLoading(false);
        return;
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', user.id);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert([{
            follower_id: currentUserId,
            following_id: user.id
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
        // 공개 공연 기록 조회
        const { data: recData, error: recErr } = await supabase
          .from('performances')
          .select('id, concert_name, artist, date, venue')
          .eq('user_id', user.id)
          .eq('is_public', true)
          .order('date', { ascending: false })
          .limit(5);

        if (recErr) throw recErr;
        setRecords(recData || []);

        // 통계 (기록 수, 게시글 수)
        const [{ count: recCount }, { count: postCount }] = await Promise.all([
          supabase
            .from('performances')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_public', true),
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);
        setStats({ recordCount: recCount || 0, postCount: postCount || 0 });
      } catch (err) {
        console.error('Error fetching user data:', err.message);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchUserData();
  }, [user.id]);

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
              <User size={48} color="#0054CB" />
            </div>
            <h2 className={styles.nickname}>{user.nickname}</h2>
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

          <div className={styles.actions}>
            <button
              className={styles.chatBtn}
              onClick={onStartChat}
              disabled={isStartingChat}
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
