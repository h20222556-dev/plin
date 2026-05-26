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
                  <svg viewBox="0 0 48 48" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="white" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round">
                      <path d="M 6 34 L 42 34" />
                      <path d="M 12 40 L 36 40" />
                      <path d="M 16 30 L 10 44" />
                      <path d="M 24 30 L 24 44" />
                      <path d="M 32 30 L 38 44" />
                    </g>
                    <path d="M24 6 C14 6 8 13 8 20 C8 31 24 44 24 44 C24 44 40 31 40 20 C40 13 34 6 24 6 Z"
                      fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                    <path d="M20 14 L20 28 M20 14 C20 14 32 11 32 19 C32 24 20 26 20 26"
                      fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="20" cy="32" r="3.5" fill="white"/>
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
