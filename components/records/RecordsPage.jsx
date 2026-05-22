'use client';

import { useState, useEffect } from 'react';
import styles from './RecordsPage.module.css';
import { useRecords } from '@/lib/hooks/useRecords';
import { useAuth } from '@/lib/hooks/useAuth';
import dynamic from 'next/dynamic';
import RecordList from './RecordList';
import RecordCalendar from './RecordCalendar';
import RecordBottomSheet from './RecordBottomSheet';
import { Map as MapIcon, List, Calendar } from 'lucide-react';

const RecordMap = dynamic(() => import('./RecordMap'), { ssr: false, loading: () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#667085'}}>지도를 불러오는 중...</div> });
const AddRecordModal = dynamic(() => import('./AddRecordModal'), { ssr: false });

const VIEWS = [
  { id: 'map', label: '지도', icon: MapIcon },
  { id: 'list', label: '목록', icon: List },
  { id: 'calendar', label: '달력', icon: Calendar },
];

export default function RecordsPage({ onNavigate }) {
  const { records, loading, deleteRecord, focusedRecord, updateRecord } = useRecords();
  const { user } = useAuth();
  const [view, setView] = useState('map');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterOnlyThisMonth, setFilterOnlyThisMonth] = useState(false);

  // Listen to focusedRecord updates from unified search
  useEffect(() => {
    if (focusedRecord) {
      setView('map');
      setSelectedRecord(focusedRecord);
    }
  }, [focusedRecord]);

  const handleRecordSelect = (record) => {
    setSelectedRecord(record);
  };

  const currentMonthRecords = records.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const displayedRecords = filterOnlyThisMonth ? currentMonthRecords : records;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>나의 공연 기록</h1>
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
            {view === 'map' && (
              <div className={styles.mapContainer}>
                <RecordMap 
                  records={records} 
                  onSelectRecord={handleRecordSelect} 
                  onMonthlyStatsClick={() => {
                    setFilterOnlyThisMonth(true);
                    setView('list');
                  }}
                />
              </div>
            )}
            {view === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flex: 1 }}>
                {filterOnlyThisMonth && (
                  <div style={{
                    backgroundColor: 'rgba(0, 84, 203, 0.05)',
                    borderBottom: '1px solid rgba(0, 84, 203, 0.1)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: '#0054CB',
                    fontWeight: 600,
                  }}>
                    <span>이번 달 기록만 필터링해서 보고 있습니다 ({currentMonthRecords.length}개)</span>
                    <button 
                      onClick={() => setFilterOnlyThisMonth(false)}
                      style={{
                        background: '#0054CB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      필터 해제
                    </button>
                  </div>
                )}
                <RecordList records={displayedRecords} onRecordSelect={handleRecordSelect} onSelectRecord={handleRecordSelect} />
              </div>
            )}
            {view === 'calendar' && <RecordCalendar records={displayedRecords} onRecordSelect={handleRecordSelect} />}
          </>
        )}
      </div>

      {/* Footer Banner - 목록/달력 뷰에서만 표시 (지도는 자체 오버레이 사용) */}
      {view !== 'map' && (
        <div className={styles.footerBanner}>
          <p>이번 달 기록 <strong>{currentMonthRecords.length}개</strong></p>
        </div>
      )}

      {/* Bottom Sheet for Details */}
      <RecordBottomSheet 
        record={selectedRecord} 
        onClose={() => setSelectedRecord(null)} 
        onDelete={selectedRecord?.userId === user?.id ? deleteRecord : null}
        onEdit={selectedRecord?.userId === user?.id ? (record) => setEditingRecord(record) : null}
      />

      {/* Edit Record Modal */}
      {editingRecord && (
        <AddRecordModal
          initialData={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={async (form) => {
            await updateRecord(editingRecord.id, form);
            setSelectedRecord(null); // close bottom sheet
          }}
        />
      )}
    </div>
  );
}
