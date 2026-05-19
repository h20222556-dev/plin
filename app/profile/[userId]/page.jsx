'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChevronLeft, Globe, Calendar, Music, MapPin, Lock, Heart, EyeOff } from 'lucide-react';
import styles from './page.module.css';

export default function UserProfilePage({ params }) {
  const resolvedParams = React.use ? React.use(params) : params;
  const userId = resolvedParams?.userId;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [activeTab, setActiveTab] = useState('records'); // records | posts | followers

  const isOwner = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;

    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        // 1. Fetch user bio & details (including privacy settings)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, nickname, profile_emoji, bio, is_public, show_records, show_posts, show_followers')
          .eq('id', userId)
          .single();

        if (userError) throw userError;
        setProfile(userData);

        // 2. Fetch records (performances)
        const isDemo = userId === '00000000-0000-0000-0000-000000000001' || userId === 'demo_user';
        const tableName = isDemo ? 'demo_performances' : 'performances';
        
        const { data: recordsData, error: recordsError } = await supabase
          .from(tableName)
          .select('*')
          .eq(isDemo ? 'userId' : 'user_id', userId)
          .order('date', { ascending: false });

        if (!recordsError) {
          setRecords(recordsData || []);
        }

        // 3. Fetch posts
        const postsTable = isDemo ? 'demo_posts' : 'posts';
        const { data: postsData, error: postsError } = await supabase
          .from(postsTable)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!postsError) {
          setPosts(postsData || []);
        }

        // 4. Fetch follow state, follower count, and followers list
        const { data: followsData, error: followsErr } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);

        if (!followsErr && followsData) {
          setFollowerCount(followsData.length);
          const followerIds = followsData.map(f => f.follower_id);
          if (followerIds.length > 0) {
            const { data: followersProfileData, error: followersProfileErr } = await supabase
              .from('users')
              .select('id, nickname, profile_emoji')
              .in('id', followerIds);
            if (!followersProfileErr) {
              setFollowers(followersProfileData || []);
            }
          } else {
            setFollowers([]);
          }
        }

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

  const isPublicAccount = profile.is_public !== false;
  const showTabMenu = isOwner || isPublicAccount;

  // Mask follower count if restricted
  const displayFollowerCount = isOwner || profile.show_followers !== false ? followerCount : '비공개';

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

            {!isOwner && (
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
              <span className={styles.statNum}>
                {isOwner || profile.show_records !== false ? records.length : '비공개'}
              </span>
              <span className={styles.statLabel}>관람 기록</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>
                {isOwner || profile.show_posts !== false ? posts.length : '비공개'}
              </span>
              <span className={styles.statLabel}>작성글</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>{displayFollowerCount}</span>
              <span className={styles.statLabel}>팔로워</span>
            </div>
          </div>
        </div>

        {/* Tab Selection (only if public or owner) */}
        {showTabMenu ? (
          <>
            <div className={styles.profileTabs}>
              <button
                className={`${styles.tabButton} ${activeTab === 'records' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('records')}
              >
                관람 기록 ({records.length})
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'posts' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('posts')}
              >
                작성글 ({posts.length})
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'followers' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('followers')}
              >
                팔로워 ({followerCount})
              </button>
            </div>

            {/* Tab Contents */}
            <div className={styles.tabContentArea}>
              {/* 1. Records Tab */}
              {activeTab === 'records' && (
                <div className={styles.section}>
                  {!isOwner && profile.show_records === false ? (
                    <div className={styles.emptyState}>
                      <EyeOff size={24} style={{ margin: '0 auto 8px', color: '#98A2B3' }} />
                      <p>이 사용자는 관람 기록을 공개하지 않았어요.</p>
                    </div>
                  ) : records.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>아직 등록된 관람 기록이 없습니다.</p>
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
              )}

              {/* 2. Posts Tab */}
              {activeTab === 'posts' && (
                <div className={styles.section}>
                  {!isOwner && profile.show_posts === false ? (
                    <div className={styles.emptyState}>
                      <EyeOff size={24} style={{ margin: '0 auto 8px', color: '#98A2B3' }} />
                      <p>이 사용자는 작성글을 공개하지 않았어요.</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>아직 등록된 작성글이 없습니다.</p>
                    </div>
                  ) : (
                    <div className={styles.recordList}>
                      {posts.map(p => (
                        <div key={p.id} className={styles.postCard}>
                          <p className={styles.postContent}>{p.content}</p>
                          <div className={styles.postFooter}>
                            <span className={styles.postDate}>
                              {new Date(p.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                            <span className={styles.postLikeCount}>
                              <Heart size={14} fill="#F43F5E" color="#F43F5E" />
                              {p.likes_count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Followers Tab */}
              {activeTab === 'followers' && (
                <div className={styles.section}>
                  {!isOwner && profile.show_followers === false ? (
                    <div className={styles.emptyState}>
                      <EyeOff size={24} style={{ margin: '0 auto 8px', color: '#98A2B3' }} />
                      <p>이 사용자는 팔로워를 공개하지 않았어요.</p>
                    </div>
                  ) : followers.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>아직 팔로워가 없습니다.</p>
                    </div>
                  ) : (
                    <div className={styles.recordList}>
                      {followers.map(f => (
                        <div 
                          key={f.id} 
                          className={styles.followerItem}
                          onClick={() => router.push(`/profile/${f.id}`)}
                        >
                          <div className={styles.followerAvatar}>
                            {f.profile_emoji || '👤'}
                          </div>
                          <div className={styles.followerInfo}>
                            <h4 className={styles.followerNickname}>{f.nickname}</h4>
                            <p className={styles.followerUsername}>@{f.nickname?.toLowerCase()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Private Account Screen */
          <div className={styles.privateAccountScreen}>
            <Lock size={40} color="#98A2B3" />
            <h3 className={styles.privateTitle}>비공개 계정이에요</h3>
            <p className={styles.privateDesc}>이 사용자의 정보는 비공개 설정되어 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
