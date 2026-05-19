'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRecords } from '@/lib/hooks/useRecords';
import styles from './ProfilePage.module.css';
import { User, Settings, Globe, Lock, Mail, Key, Shield, Info, LogOut, ChevronRight } from 'lucide-react';

export default function ProfilePage({ initialSection = 'profile' }) {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const logout = auth?.logout ?? (() => {});
  const updateProfile = auth?.updateProfile ?? (() => {});
  const { records } = useRecords();
  const [activeSection, setActiveSection] = useState(initialSection); // profile | settings
  const [editMode, setEditMode] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [isPublic, setIsPublic] = useState(user?.is_public ?? true);
  
  // Detailed privacy settings
  const [showRecords, setShowRecords] = useState(user?.show_records ?? true);
  const [showPosts, setShowPosts] = useState(user?.show_posts ?? true);
  const [showFollowers, setShowFollowers] = useState(user?.show_followers ?? true);
  const [followerCount, setFollowerCount] = useState(0);

  // Sync state when user object changes
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setIsPublic(user.is_public ?? true);
      setShowRecords(user.show_records ?? true);
      setShowPosts(user.show_posts ?? true);
      setShowFollowers(user.show_followers ?? true);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
      setIsPublic(user.is_public ?? true);
      setShowRecords(user.show_records ?? true);
      setShowPosts(user.show_posts ?? true);
      setShowFollowers(user.show_followers ?? true);
    }
  }, [user]);

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

  const publicRecords = records.filter(r => r.isPublic);

  const handlePrivacyChange = (key, newValue) => {
    let nextIsPublic = isPublic;
    let nextShowRecords = showRecords;
    let nextShowPosts = showPosts;
    let nextShowFollowers = showFollowers;

    if (key === 'isPublic') {
      nextIsPublic = newValue;
      if (newValue) {
        nextShowRecords = true;
        nextShowPosts = true;
        nextShowFollowers = true;
      } else {
        nextShowRecords = false;
        nextShowPosts = false;
        nextShowFollowers = false;
      }
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

    updateProfile({
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
            <div className={styles.section}>
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
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>최근 기록</h3>
              {records.slice(0, 3).map(r => (
                <div key={r.id} className={styles.recentRecord}>
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
                </div>
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
