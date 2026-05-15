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

const AddRecordModal = dynamic(() => import('@/components/records/AddRecordModal'), { ssr: false });

const TABS = [
  { id: 'records', label: '지도', icon: Map },
  { id: 'concerts', label: '공연', icon: Music },
  { id: 'add', label: '추가하기', icon: Plus, isFab: true },
  { id: 'community', label: '커뮤니티', icon: MessageCircle },
  { id: 'profile', label: '프로필', icon: User },
];

export default function MainLayout() {
  const [activeTab, setActiveTab] = useState('records');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { addRecord } = useRecords();
  const { user } = useAuth();
  const handleSaveRecord = async (form) => {
    try {
      await addRecord(form);
      setIsAddOpen(false);
    } catch (e) {
      // addRecord already shows alert on error
    }
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'records': return <RecordsPage onNavigate={setActiveTab} />;
      case 'concerts': return <ConcertsPage onNavigate={setActiveTab} />;
      case 'community': return <CommunityPage onNavigate={setActiveTab} />;
      case 'profile': return <ProfilePage onNavigate={setActiveTab} />;
      default: return <RecordsPage onNavigate={setActiveTab} />;
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
                  <tab.icon size={28} color="white" strokeWidth={2.5} />
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
    </div>
  );
}
