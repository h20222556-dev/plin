'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChevronLeft, Globe, Calendar, Music, MapPin } from 'lucide-react';
import styles from './page.module.css';

export default function UserProfilePage({ params }) {
  const resolvedParams = React.use ? React.use(params) : params;
  const userId = resolvedParams?.userId;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        // 1. Fetch user bio & details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, nickname, profile_emoji, bio')
          .eq('id', userId)
          .single();

        if (userError) throw userError;
        setProfile(userData);

        // 2. Fetch public records for this user
        const isDemo = userId === '00000000-0000-0000-0000-000000000001' || userId === 'demo_user';
        const tableName = isDemo ? 'demo_performances' : 'performances';
        
        const { data: recordsData, error: recordsError } = await supabase
          .from(tableName)
          .select('*')
          .order('date', { ascending: false });

        if (!recordsError) {
          // Filter records belonging to this user
          // In demo mode, records don't have user_id, so we assume they all show up or filter by user_id if present
          const userRecs = recordsData.filter(r => !r.userId || r.userId === userId || r.user_id === userId);
          setRecords(userRecs);
        }

        // 3. Fetch follow state and follower count
        const { count, error: countErr } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);

        if (!countErr) setFollowerCount(count || 0);

        if (currentUser) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId)
            .maybeSingle();

          setIsFollowing(!!followData);
        }

      } catch (err) {
        console.error('프로필 조회 오류:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: userId }]);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('팔로우 처리 실패:', err.message);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
        <p>프로필을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorPage}>
        <h2 className={styles.errorTitle}>프로필을 찾을 수 없습니다</h2>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          홈으로 가기
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.iconBtn} onClick={() => router.push('/')}>
          <ChevronLeft size={24} />
        </button>
        <span className={styles.headerTitle}>{profile.nickname}님의 프로필</span>
        <div style={{ width: 24 }} /> {/* Spacing */}
      </div>

      <div className={styles.content}>
        {/* Profile Card */}
        <div className={styles.profileCard}>
          <div className={styles.profileTop}>
            <div className={styles.avatarLarge}>
              {profile.profile_emoji || '👤'}
            </div>

            <div className={styles.profileInfo}>
              <h2 className={styles.nickname}>{profile.nickname}</h2>
              <p className={styles.username}>@{profile.nickname?.toLowerCase()}</p>
            </div>

            {currentUser?.id !== userId && (
              <button
                className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`}
                onClick={handleFollowToggle}
              >
                {isFollowing ? '팔로잉' : '팔로우'}
              </button>
            )}
          </div>

          <p className={styles.bio}>
            {profile.bio || '등록된 소개글이 없습니다.'}
          </p>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{records.length}</span>
              <span className={styles.statLabel}>공개 기록</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{followerCount}</span>
              <span className={styles.statLabel}>팔로워</span>
            </div>
          </div>
        </div>

        {/* User's public records */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>🎵 {profile.nickname}님의 공개 기록</h3>
            <span className={styles.sectionSub}>{records.length}개</span>
          </div>

          {records.length === 0 ? (
            <div className={styles.emptyState}>
              <p>아직 등록된 공개 기록이 없습니다.</p>
            </div>
          ) : (
            <div className={styles.recordList}>
              {records.map(r => (
                <div key={r.id} className={styles.recordCard}>
                  <div className={styles.cardHeader}>
                    <span className={styles.emotionEmoji}>{r.emotion || '🎵'}</span>
                    <div>
                      <h4 className={styles.concertName}>{r.concertName || r.name}</h4>
                      <p className={styles.artistName}>{r.artist}</p>
                    </div>
                  </div>
                  
                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <Calendar size={14} />
                      <span>{r.date}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <MapPin size={14} />
                      <span>{r.venue}</span>
                    </div>
                  </div>

                  {r.memo && <p className={styles.memoText}>{r.memo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
