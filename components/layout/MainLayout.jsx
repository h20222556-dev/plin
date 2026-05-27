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

        </header>

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
                  <img
                    src="/plin-logo.png"
                    alt="기록하기"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                  />
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
                color={activeTab === tab.id ? '#2563EB' : '#6B7280'} 
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
