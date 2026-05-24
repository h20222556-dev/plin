'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRecords } from '@/lib/hooks/useRecords';
import styles from './ProfilePage.module.css';
import { User, Settings, Globe, Lock, Mail, Key, Shield, Info, LogOut, ChevronRight } from 'lucide-react';

export default function ProfilePage({ initialSection = 'profile', onRecordNavigate }) {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const logout = auth?.logout ?? (() => {});
  const updateProfile = auth?.updateProfile ?? (() => {});
  const { records } = useRecords();
  const [activeSection, setActiveSection] = useState(initialSection); // profile | settings
  const [editMode, setEditMode] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isPublic, setIsPublic] = useState(false);
  
  // Detailed privacy settings
  const [showRecords, setShowRecords] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const isDemoMode = auth?.isDemoMode ?? false;
  const [blockedUsers, setBlockedUsers] = useState([]);

  // Sync nickname only, since it is edited via a different save button
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
    }
  }, [user?.nickname]);

  // Load privacy settings from Supabase on mount/user ID change
  useEffect(() => {
    if (!user?.id) return;

    const loadPrivacySettings = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_public, show_records, show_posts, show_followers')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setIsPublic(data.is_public ?? true);
          setShowRecords(data.show_records ?? true);
          setShowPosts(data.show_posts ?? true);
          setShowFollowers(data.show_followers ?? true);
        }
      } catch (err) {
        console.error('Failed to load privacy settings:', err);
      }
    };

    loadPrivacySettings();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    
    const fetchFollowerCount = async () => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);
      
      if (!error) setFollowerCount(count || 0);
    };

    fetchFollowerCount();
  }, [user?.id]);

  // Load blocked users
  useEffect(() => {
    if (!user?.id || activeSection !== 'settings') return;

    const fetchBlockedUsers = async () => {
      if (isDemoMode) {
        setBlockedUsers([
          {
            id: 'mock-block-1',
            blocked_id: 'demo-user-2',
            created_at: new Date().toISOString(),
            user: { nickname: '안유진진자라', profile_emoji: '🐶' }
          }
        ]);
        return;
      }

      try {
        // JOIN 대신 두 번 조회하는 방식으로 수정
        const { data: blockList, error } = await supabase
          .from('blocked_users')
          .select('id, blocked_id, created_at')
          .eq('blocker_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('차단 목록 조회 실패:', error.message);
          return;
        }

        if (!blockList || blockList.length === 0) {
          setBlockedUsers([]);
          return;
        }

        // 차단된 유저 정보 별도 조회
        const blockedIds = blockList.map(b => b.blocked_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, nickname, profile_emoji')
          .in('id', blockedIds);

        const merged = blockList.map(block => ({
          ...block,
          user: usersData?.find(u => u.id === block.blocked_id) ?? null
        }));

        setBlockedUsers(merged);
      } catch (err) {
        console.error('Failed to fetch blocked users:', err);
      }
    };

    fetchBlockedUsers();
  }, [user?.id, activeSection, isDemoMode]);

  const handleUnblock = async (blockId) => {
    const confirmed = window.confirm('차단을 해제하시겠습니까?');
    if (!confirmed) return;

    if (isDemoMode) {
      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
      alert('차단이 해제되었습니다. (데모 모드)');
      return;
    }

    const blockedItem = blockedUsers.find(b => b.id === blockId);
    const blockedUserId = blockedItem?.blocked_id;
    if (!blockedUserId) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockId);

      if (error) {
        console.error('차단 해제 실패:', error.message);
        alert('차단 해제에 실패했습니다.');
        return;
      }

      // Also unblock the chat room if any exists between these users
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${blockedUserId}),and(user_a_id.eq.${blockedUserId},user_b_id.eq.${user.id})`);

      if (rooms && rooms.length > 0) {
        for (const room of rooms) {
          await supabase
            .from('chat_rooms')
            .update({ is_blocked: false, blocked_by: null })
            .eq('id', room.id);
        }
      }

      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
      alert('차단이 해제되었습니다.');
    } catch (err) {
      console.error('Error during unblock:', err);
    }
  };

  const publicRecords = records.filter(r => r.isPublic);

  const savePrivacySettings = async (settings) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_public: settings.isPublic,
          show_records: settings.showRecords,
          show_posts: settings.showPosts,
          show_followers: settings.showFollowers
        })
        .eq('id', user.id);

      if (error) throw error;

      // Also update auth context so other components stay in sync immediately
      if (auth?.updateProfile) {
        auth.updateProfile({
          isPublic: settings.isPublic,
          showRecords: settings.showRecords,
          showPosts: settings.showPosts,
          showFollowers: settings.showFollowers
        });
      }
    } catch (err) {
      console.error('Error saving privacy settings:', err);
    }
  };

  const handlePrivacyChange = async (key, newValue) => {
    let nextIsPublic = isPublic;
    let nextShowRecords = showRecords;
    let nextShowPosts = showPosts;
    let nextShowFollowers = showFollowers;

    if (key === 'isPublic') {
      nextIsPublic = newValue;
      nextShowRecords = newValue;
      nextShowPosts = newValue;
      nextShowFollowers = newValue;
    } else {
      if (key === 'showRecords') nextShowRecords = newValue;
      if (key === 'showPosts') nextShowPosts = newValue;
      if (key === 'showFollowers') nextShowFollowers = newValue;

      if (nextShowRecords || nextShowPosts || nextShowFollowers) {
        nextIsPublic = true;
      } else {
        nextIsPublic = false;
      }
    }

    setIsPublic(nextIsPublic);
    setShowRecords(nextShowRecords);
    setShowPosts(nextShowPosts);
    setShowFollowers(nextShowFollowers);

    await savePrivacySettings({
      isPublic: nextIsPublic,
      showRecords: nextShowRecords,
      showPosts: nextShowPosts,
      showFollowers: nextShowFollowers
    });
  };

  const handleSave = () => {
    updateProfile({ nickname, isPublic });
    setEditMode(false);
  };

  return (
    <div className={styles.page}>
      {/* Header tabs */}
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeSection === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            프로필
          </button>
          <button
            className={`${styles.tab} ${activeSection === 'settings' ? styles.tabActive : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            설정
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {activeSection === 'profile' && (
          <div className="animate-fade-in">
            {/* Profile card */}
            <div className={styles.profileCard}>
              <div className={styles.profileTop}>
                <div className={styles.avatarLarge}>
                   <User size={32} color="#667085" />
                </div>

                <div className={styles.profileInfo}>
                  {editMode ? (
                    <input
                      className="input-field"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder="닉네임"
                    />
                  ) : (
                    <>
                      <h2 className={styles.nickname}>{user?.nickname}</h2>
                      <p className={styles.username}>{user?.username || '@' + user?.nickname?.toLowerCase()}</p>
                    </>
                  )}
                </div>

                <button
                  className={styles.editBtn}
                  onClick={() => editMode ? handleSave() : setEditMode(true)}
                >
                  {editMode ? '저장' : '편집'}
                </button>
              </div>

              {/* Stats */}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statNum}>{records.length}</span>
                  <span className={styles.statLabel}>기록</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span className={styles.statNum}>{publicRecords.length}</span>
                  <span className={styles.statLabel}>공개 기록</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.stat}>
                  <span className={styles.statNum}>{followerCount}</span>
                  <span className={styles.statLabel}>팔로워</span>
                </div>
              </div>

              {/* Visibility */}
              {editMode && (
                <div className={styles.visibilityToggle}>
                  <span className={styles.visLabel}>계정 공개 여부</span>
                  <div className={styles.toggleRow}>
                    <button
                      className={`${styles.toggleBtn} ${isPublic ? styles.toggleActive : ''}`}
                      onClick={() => setIsPublic(true)}
                    >
                      <Globe size={16} />
                      <span>공개</span>
                    </button>
                    <button
                      className={`${styles.toggleBtn} ${!isPublic ? styles.toggleActive : ''}`}
                      onClick={() => setIsPublic(false)}
                    >
                      <Lock size={16} />
                      <span>비공개</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Account badge */}
              {!editMode && (
                <div className={styles.accountBadge}>
                  {isPublic ? <Globe size={14} color="#667085" /> : <Lock size={14} color="#667085" />}
                  <span>{isPublic ? '공개 계정' : '비공개 계정'}</span>
                </div>
              )}
            </div>

            {/* Favorite Artists */}
            {user?.favoriteArtists && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>좋아하는 아티스트</h3>
                <div className={styles.artistChips}>
                  {user.favoriteArtists.map(a => (
                    <span key={a} className="chip active">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* My Public Map */}
            <div className={styles.section} style={{ marginTop: '24px' }}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>나의 공개 지도</h3>
                <span className={styles.sectionSub}>{publicRecords.length}개 공개</span>
              </div>
              <div className={styles.mapBanner}>
                <Globe size={24} color="#0054CB" />
                <div>
                  <p className={styles.mapBannerTitle}>공연 지도 공개하기</p>
                  <p className={styles.mapBannerDesc}>내 공연 지도를 공개하면 공연 메이트를 찾을 수 있어요!</p>
                </div>
              </div>
            </div>

            {/* Recent Records */}
            <div className={styles.section} style={{ marginTop: '24px' }}>
              <h3 className={styles.sectionTitle}>최근 기록</h3>
              {records.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>아직 기록이 없습니다.</p>
              )}
              {records.slice(0, 3).map(r => (
                <button
                  key={r.id}
                  className={`${styles.recentRecord} ${styles.recentRecordClickable}`}
                  onClick={() => onRecordNavigate?.(r.id)}
                  title="지도에서 보기"
                >
                  <div className={styles.recentInfo}>
                    <p className={styles.recentName}>{r.concertName}</p>
                    <p className={styles.recentDate}>{r.date}</p>
                  </div>
                  <div className={styles.recordStatus}>
                    {r.isPublic ? <Globe size={14} color="#10B981" /> : <Lock size={14} color="#667085" />}
                    <span className={r.isPublic ? styles.publicDot : styles.privateDot}>
                      {r.isPublic ? '공개' : '비공개'}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#667085" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="animate-fade-in">
            <div className={styles.settingsList}>
              <div className={styles.settingsGroup}>
                <p className={styles.groupLabel}>계정</p>
                <div className={styles.settingItem}>
                  <Mail size={20} color="#667085" />
                  <div className={styles.settingInfo}>
                    <p className={styles.settingTitle}>이메일</p>
                    <p className={styles.settingValue}>{user?.email}</p>
                  </div>
                </div>
                <button className={styles.settingItem}>
                  <Key size={20} color="#667085" />
                  <div className={styles.settingInfo}>
                    <p className={styles.settingTitle}>비밀번호 변경</p>
                  </div>
                  <ChevronRight size={20} color="#98A2B3" />
                </button>
                <button
                  className={styles.settingItem}
                  onClick={() => {
                    setActiveSection('profile');
                    setEditMode(true);
                  }}
                >
                  <User size={20} color="#667085" />
                  <div className={styles.settingInfo}>
                    <p className={styles.settingTitle}>프로필 편집</p>
                  </div>
                  <ChevronRight size={20} color="#98A2B3" />
                </button>
              </div>

              <div className={styles.settingsGroup}>
                <p className={styles.groupLabel}>개인정보 및 공개 설정</p>
                <div className={styles.settingItem}>
                  {isPublic ? <Globe size={20} color="#667085" /> : <Lock size={20} color="#667085" />}
                  <div className={styles.settingInfo}>
                    <p className={styles.settingTitle}>계정 전체 공개</p>
                    <p className={styles.settingValue}>{isPublic ? '공개 계정' : '비공개 계정'}</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={isPublic}
                      onChange={(e) => handlePrivacyChange('isPublic', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <div className={styles.settingInfo} style={{ paddingLeft: '28px' }}>
                    <p className={styles.settingTitle}>내 관람 기록 표시</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={showRecords}
                      onChange={(e) => handlePrivacyChange('showRecords', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <div className={styles.settingInfo} style={{ paddingLeft: '28px' }}>
                    <p className={styles.settingTitle}>내 작성글 표시</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={showPosts}
                      onChange={(e) => handlePrivacyChange('showPosts', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                <div className={styles.settingItem}>
                  <div className={styles.settingInfo} style={{ paddingLeft: '28px' }}>
                    <p className={styles.settingTitle}>내 팔로워 표시</p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={showFollowers}
                      onChange={(e) => handlePrivacyChange('showFollowers', e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              <div className={styles.settingsGroup}>
                <p className={styles.groupLabel}>차단 관리</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                  {blockedUsers.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '8px 16px' }}>차단한 사용자가 없습니다.</p>
                  ) : (
                    blockedUsers.map(blocked => (
                      <div key={blocked.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>{blocked.user?.profile_emoji || '🧑‍🎤'}</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {blocked.user?.nickname || '알 수 없는 사용자'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnblock(blocked.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#ff3b30',
                            cursor: 'pointer'
                          }}
                        >
                          차단 해제
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.settingsGroup}>
                <p className={styles.groupLabel}>앱 정보</p>
                <div className={styles.settingItem}>
                  <Info size={20} color="#667085" />
                  <div className={styles.settingInfo}>
                    <p className={styles.settingTitle}>PLIN 버전</p>
                    <p className={styles.settingValue}>1.0.0 (Beta)</p>
                  </div>
                </div>
                <button className={styles.settingItem}>
                  <Shield size={20} color="#667085" />
                  <div className={styles.settingInfo}>
                    <p className={styles.settingTitle}>이용약관</p>
                  </div>
                  <ChevronRight size={20} color="#98A2B3" />
                </button>
              </div>

              <button
                className={styles.logoutBtn}
                onClick={() => {
                  if (confirm('로그아웃하시겠어요?')) logout();
                }}
              >
                <LogOut size={20} />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
