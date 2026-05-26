'use client';

import { useState, useEffect } from 'react';
import styles from './MainLayout.module.css';
import RecordsPage from '@/components/records/RecordsPage';
import ConcertsPage from '@/components/concerts/ConcertsPage';
import CommunityPage from '@/components/community/CommunityPage';
import ProfilePage from '@/components/profile/ProfilePage';
import dynamic from 'next/dynamic';
import { Map, Music, Plus, MessageCircle, User, Info } from 'lucide-react';
import { useRecords } from '@/lib/hooks/useRecords';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import UnifiedSearchBar from '@/components/search/UnifiedSearchBar';
import SearchModal from '@/components/search/SearchModal';

const AddRecordModal = dynamic(() => import('@/components/records/AddRecordModal'), { ssr: false });

const TABS = [
  { id: 'records', label: '지도', icon: Map },
  { id: 'concerts', label: '공연', icon: Music },
  { id: 'add', label: '추가하기', icon: Plus, isFab: true },
  { id: 'community', label: '커뮤니티', icon: MessageCircle },
  { id: 'profile', label: '프로필', icon: User },
];

export default function MainLayout({ initialTab = 'records', initialSection = 'profile' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedRecordId, setHighlightedRecordId] = useState(null);
  const { addRecord, records, setFocusedRecord } = useRecords();
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        setActiveTab(tabParam);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (sessionStorage.getItem('pendingChatRoom')) {
        setActiveTab('community');
      }
    }
  }, []);
  const handleSaveRecord = async (form) => {
    try {
      console.log('MainLayout starting save:', form);
      const result = await addRecord(form);
      console.log('MainLayout save success:', result);
      setIsAddOpen(false);
    } catch (e) {
      console.error('MainLayout save error:', e);
      alert(`저장에 실패했습니다: ${e.message || '알 수 없는 오류'}`);
      throw e; // Modal에서 로딩 상태를 해제할 수 있도록 다시 던짐
    }
  };

  const handleRecordNavigate = (recordId) => {
    setHighlightedRecordId(recordId);
    if (records) {
      const match = records.find(r => r.id === recordId);
      if (match) {
        setFocusedRecord(match);
      }
    }
    setActiveTab('records');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'records': return <RecordsPage onNavigate={setActiveTab} onOpenSearch={() => setIsSearchOpen(true)} highlightedRecordId={highlightedRecordId} onClearHighlight={() => setHighlightedRecordId(null)} />;
      case 'concerts': return <ConcertsPage onNavigate={setActiveTab} onOpenSearch={() => setIsSearchOpen(true)} />;
      case 'community': return <CommunityPage onNavigate={setActiveTab} onOpenSearch={() => setIsSearchOpen(true)} />;
      case 'profile': return <ProfilePage onNavigate={setActiveTab} onOpenSearch={() => setIsSearchOpen(true)} initialSection={initialSection} onRecordNavigate={handleRecordNavigate} />;
      default: return <RecordsPage onNavigate={setActiveTab} onOpenSearch={() => setIsSearchOpen(true)} highlightedRecordId={highlightedRecordId} onClearHighlight={() => setHighlightedRecordId(null)} />;
    }
  };

  const { isDemoMode } = useAuth();
  const [showToast, setShowToast] = useState(false);

  const handleDemoBadgeClick = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className={styles.layout}>
      {/* Top Header for Home navigation */}
      <header className={styles.topHeader}>
        <button className={styles.logoBtn} onClick={() => setActiveTab('records')}>
          <h1 className={styles.logoText}>PLIN</h1>
        </button>
        
        <div className={styles.searchBarWrapper}>
          <UnifiedSearchBar onClick={() => setIsSearchOpen(true)} />
        </div>

        {isDemoMode && (
          <button className={styles.demoBadge} onClick={handleDemoBadgeClick}>
            <span>데모 모드</span>
            <Info size={14} />
          </button>
        )}
      </header>

      {/* Toast Notification */}
      {showToast && (
        <div className={styles.toast}>
          실제 데이터는 저장되지 않습니다. 회원가입하면 기록이 영구 저장됩니다.
        </div>
      )}

      {/* Page Content */}
      <main className={styles.main}>
        {renderPage()}
      </main>

      {/* Bottom Tab Bar */}
      <nav className={styles.tabBar}>
        {TABS.map(tab => {
          if (tab.isFab) {
            return (
              <div key={tab.id} className={styles.fabContainer}>
                <button
                  className={styles.fabButton}
                  onClick={() => setIsAddOpen(true)}
                >
                  <svg viewBox="0 0 48 48" width="34" height="34" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* 상단 핀+음표 아이콘 */}
                    <path d="M24 4 C17 4 12 9 12 15 C12 23 24 32 24 32 C24 32 36 23 36 15 C36 9 31 4 24 4 Z"
                      fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M21 10 L21 20 M21 10 C21 10 29 8 29 14 C29 18 21 19 21 19"
                      fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="21" cy="23" r="2.5" fill="white"/>

                    {/* 하단 지도 격자선 */}
                    {/* 지도 외곽선 */}
                    <rect x="6" y="34" width="36" height="12" rx="2"
                      fill="none" stroke="white" strokeWidth="1.5"/>
                    {/* 지도 가로선 */}
                    <line x1="6" y1="39" x2="42" y2="39"
                      stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
                    {/* 지도 세로선 */}
                    <line x1="18" y1="34" x2="18" y2="46"
                      stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
                    <line x1="30" y1="34" x2="30" y2="46"
                      stroke="white" strokeWidth="1" strokeOpacity="0.7"/>
                    {/* 지도 위에 작은 핀 점 */}
                    <circle cx="24" cy="37" r="1.5" fill="white"/>
                    <line x1="24" y1="38.5" x2="24" y2="40"
                      stroke="white" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              className={`${styles.tabItem} ${activeTab === tab.id ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon 
                size={24} 
                color={activeTab === tab.id ? '#0054CB' : '#667085'} 
                strokeWidth={activeTab === tab.id ? 2.5 : 2}
              />
              <span className={styles.tabLabel}>{tab.label}</span>
              {activeTab === tab.id && <div className={styles.tabIndicator} />}
            </button>
          );
        })}
      </nav>

      {/* Global Add Record Modal */}
      {isAddOpen && (
        <AddRecordModal
          onClose={() => setIsAddOpen(false)}
          onSave={handleSaveRecord}
        />
      )}

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tabId) => setActiveTab(tabId)}
      />
    </div>
  );
}
