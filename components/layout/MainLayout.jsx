'use client';

import { useState } from 'react';
import styles from './MainLayout.module.css';
import RecordsPage from '@/components/records/RecordsPage';
import ConcertsPage from '@/components/concerts/ConcertsPage';
import CommunityPage from '@/components/community/CommunityPage';
import ProfilePage from '@/components/profile/ProfilePage';
import dynamic from 'next/dynamic';
import { Map, Music, Plus, MessageCircle, User } from 'lucide-react';
import { useRecords } from '@/lib/hooks/useRecords';

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
  const { addRecord, records } = useRecords();
  const { user } = useAuth();

  // 샘플 데이터 생성 로직 (최초 1회)
  useEffect(() => {
    const seedData = async () => {
      if (!user || records.length > 0 || localStorage.getItem('plin_seeded')) return;

      try {
        const sampleRecord = {
          concertName: '2024 IU H.E.R. WORLD TOUR CONCERT IN SEOUL',
          artist: 'IU (아이유)',
          date: '2024-03-02',
          venue: 'KSPO DOME (올림픽체조경기장)',
          lat: 37.5206,
          lng: 127.1274,
          weather: 'sunny',
          pinIcon: 'heart',
          memo: '아이유의 압도적인 라이브와 화려한 연출... 홀씨 무대가 특히 인상적이었어요! 360도 무대라서 어디서든 잘 보였고 팬서비스도 최고였습니다. 💜',
          setlist: ['홀씨', 'Jam Jam', 'Ah puh', '삐삐', 'Obliviate', 'Celebrity', 'Blueming', '에이트', 'Love wins all'],
          tags: ['아이유', '단독콘서트', '감동', 'KSPO_DOME'],
          photos: ['https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000'],
          isPublic: true
        };

        const perf = await addRecord(sampleRecord);
        if (perf) {
          // 커뮤니티 게시글도 함께 생성
          const { error: postError } = await supabase
            .from('posts')
            .insert([{
              user_id: user.id,
              performance_id: perf.id,
              content: '드디어 다녀온 아이유 콘서트! 셋리스트부터 분위기까지 모든 게 완벽했습니다. 유애나들과 함께 떼창하던 순간이 잊혀지지 않네요. PLIN 지도에 첫 기록을 남겨보니 정말 뿌듯합니다! 💜',
              tags: ['아이유', '후기', 'PLIN', '유애나'],
              likes_count: 0
            }]);
          
          if (!postError) {
            localStorage.setItem('plin_seeded', 'true');
            console.log('Sample data seeded successfully');
          }
        }
      } catch (err) {
        console.error('Failed to seed sample data:', err);
      }
    };

    seedData();
  }, [user, records.length, addRecord]);
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
        <AddRecordModal
          onClose={() => setIsAddOpen(false)}
          onSave={handleSaveRecord}
        />
      )}
    </div>
  );
}
