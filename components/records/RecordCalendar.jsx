'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import styles from './RecordCalendar.module.css';

export default function RecordCalendar({ records, onSelectRecord, onRecordSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group records by date
  const recordsByDate = {};
  records.forEach(record => {
    if (record.date) {
      const key = record.date.slice(0, 10);
      if (!recordsByDate[key]) recordsByDate[key] = [];
      recordsByDate[key].push(record);
    }
  });

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleRecordItemClick = (record) => {
    if (onRecordSelect) {
      onRecordSelect(record);
    } else if (onSelectRecord) {
      onSelectRecord(record);
    }
  };

  const selectedDatePerformances = selectedDate
    ? records.filter(r => r.date && r.date.slice(0, 10) === selectedDate)
    : [];

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  // Pad start of month
  const startPad = monthStart.getDay();

  return (
    <div className={styles.calendar}>
      {/* Month Navigation */}
      <div className={styles.nav}>
        <button className={styles.navBtn} onClick={prevMonth}>‹</button>
        <h2 className={styles.monthTitle}>
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button className={styles.navBtn} onClick={nextMonth}>›</button>
      </div>

      {/* Weekday Headers */}
      <div className={styles.weekdays}>
        {weekdays.map(d => (
          <div key={d} className={`${styles.weekday} ${d === '일' ? styles.sunday : d === '토' ? styles.saturday : ''}`}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className={styles.grid}>
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className={styles.dayEmpty} />
        ))}

        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dayRecords = recordsByDate[key] || [];
          const hasRecord = dayRecords.length > 0;
          const isSelected = selectedDate === key;

          return (
            <button
              key={key}
              className={`${styles.day} ${hasRecord ? styles.dayHasRecord : ''} ${isSelected ? styles.daySelected : ''}`}
              onClick={() => handleDateClick(key)}
            >
              <span className={styles.dayNum}>{format(day, 'd')}</span>
              {hasRecord && (
                <div className={styles.dayDots}>
                  {dayRecords.slice(0, 3).map((r, i) => (
                    <span key={i} className={styles.dayDot} title={r.emotion}>
                      {r.emotion || '🎵'}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Records Section */}
      <div className={styles.monthRecords}>
        <h3 className={styles.monthRecordsTitle}>
          {selectedDate ? `${selectedDate} 공연` : `이번 달 기록 (${Object.values(recordsByDate).flat().length}개)`}
        </h3>
        <div className={styles.monthRecordList}>
          {selectedDate ? (
            selectedDatePerformances.length > 0 ? (
              selectedDatePerformances.map(r => (
                <button
                  key={r.id}
                  className={styles.monthRecordItem}
                  onClick={() => handleRecordItemClick(r)}
                >
                  <span className={styles.monthRecordEmoji}>{r.emotion || '🎵'}</span>
                  <div className={styles.monthRecordInfo}>
                    <span className={styles.monthRecordName}>{r.concertName}</span>
                    <span className={styles.monthRecordDate}>{r.date}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.noRecords}>
                <p>이 날에는 공연이 없습니다.</p>
              </div>
            )
          ) : (
            records
              .filter(r => r.date && r.date.startsWith(format(currentMonth, 'yyyy-MM')))
              .map(r => (
                <button
                  key={r.id}
                  className={styles.monthRecordItem}
                  onClick={() => handleRecordItemClick(r)}
                >
                  <span className={styles.monthRecordEmoji}>{r.emotion || '🎵'}</span>
                  <div className={styles.monthRecordInfo}>
                    <span className={styles.monthRecordName}>{r.concertName}</span>
                    <span className={styles.monthRecordDate}>{r.date}</span>
                  </div>
                </button>
              ))
          )}
          {!selectedDate && !records.some(r => r.date && r.date.startsWith(format(currentMonth, 'yyyy-MM'))) && (
            <p className={styles.noRecords}>이번 달 기록이 없어요</p>
          )}
        </div>
      </div>
    </div>
  );
}
