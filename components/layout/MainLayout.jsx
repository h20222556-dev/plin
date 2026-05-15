'use client';

import { useState } from 'react';
import styles from './MainLayout.module.css';
import RecordsPage from '@/components/records/RecordsPage';
import ConcertsPage from '@/components/concerts/ConcertsPage';
import CommunityPage from '@/components/community/CommunityPage';
import ProfilePage from '@/components/profile/ProfilePage';
import AddRecordModal from '@/components/records/AddRecordModal';
import { Map, Music, Plus, MessageCircle, User, Search } from 'lucide-react';

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

  const renderPage = () => {
    switch (activeTab) {
      case 'records': return <RecordsPage onNavigate={setActiveTab} />;
      case 'concerts': return <ConcertsPage onNavigate={setActiveTab} />;
      case 'community': return <CommunityPage onNavigate={setActiveTab} />;
      case 'profile': return <ProfilePage onNavigate={setActiveTab} />;
      default: return <RecordsPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className={styles.layout}>
      {/* Top Header for Home navigation */}
      <header className={styles.topHeader}>
        <button className={styles.logoBtn} onClick={() => setActiveTab('records')}>
          <h1 className={styles.logoText}>PLIN</h1>
        </button>
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
        <AddRecordModal onClose={() => setIsAddOpen(false)} />
      )}
    </div>
  );
}
