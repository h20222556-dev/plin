'use client';

import { useState } from 'react';
import styles from './RecordsPage.module.css';
import { useRecords } from '@/lib/hooks/useRecords';
import { useAuth } from '@/lib/hooks/useAuth';
import dynamic from 'next/dynamic';
import RecordList from './RecordList';
import RecordCalendar from './RecordCalendar';
import RecordBottomSheet from './RecordBottomSheet';
import { Map as MapIcon, List, Calendar } from 'lucide-react';

const RecordMap = dynamic(() => import('./RecordMap'), { ssr: false, loading: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#667085'}}>지도를 불러오는 중...</div> });

const VIEWS = [
  { id: 'map', label: '지도', icon: MapIcon },
  { id: 'list', label: '목록', icon: List },
  { id: 'calendar', label: '달력', icon: Calendar },
];

export default function RecordsPage({ onNavigate }) {
  const { records, loading, deleteRecord } = useRecords();
  const { user } = useAuth();
  const [view, setView] = useState('map');
  const [selectedRecord, setSelectedRecord] = useState(null);

  const handleRecordSelect = (record) => {
    setSelectedRecord(record);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>나의 공연 기록</h1>
            <p className={styles.subtitle}>모든 순간을 지도로 남겨보세요</p>
          </div>
        </div>

        <div className={styles.tabs}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`${styles.viewTab} ${view === v.id ? styles.viewTabActive : ''}`}
              onClick={() => setView(v.id)}
            >
              <v.icon size={16} color={view === v.id ? '#0054CB' : '#667085'} />
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px' }}>불러오는 중...</div>
        ) : (
          <>
            {view === 'map' && <RecordMap records={records} onSelectRecord={handleRecordSelect} />}
            {view === 'list' && <RecordList records={records} onRecordSelect={handleRecordSelect} />}
            {view === 'calendar' && <RecordCalendar records={records} onRecordSelect={handleRecordSelect} />}
          </>
        )}
      </div>

      {/* Footer Banner */}
      <div className={styles.footerBanner}>
        <p>이번 달 기록 <strong>{records.length}개</strong></p>
      </div>

      {/* Bottom Sheet for Details */}
      <RecordBottomSheet 
        record={selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
        onDelete={selectedRecord?.userId === user?.id ? deleteRecord : null}
      />
    </div>
  );
}
