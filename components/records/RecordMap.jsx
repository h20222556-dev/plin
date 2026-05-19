'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './RecordMap.module.css';
import { useRecords } from '@/lib/hooks/useRecords';

export default function RecordMap({ records, onSelectRecord }) {
  const { focusedRecord } = useRecords();
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);
  const activeInfoWindowRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    let retryCount = 0;
    const maxRetry = 50;

    const tryInit = () => {
      if (!containerRef.current) {
        console.warn('[RecordMap] containerRef가 없습니다.');
        return;
      }

      if (!window.kakao || !window.kakao.maps) {
        retryCount++;
        if (retryCount < maxRetry) {
          setTimeout(tryInit, 200);
        } else {
          console.error('[RecordMap] 카카오맵 SDK 로드 실패: 최대 재시도 횟수 초과');
        }
        return;
      }

      window.kakao.maps.load(() => {
        if (!containerRef.current) return;

        console.log('[RecordMap] 지도 초기화 시작');
        console.log('[RecordMap] 컨테이너 크기:', containerRef.current.offsetWidth, containerRef.current.offsetHeight);

        // Default center: Seoul City Hall
        const initialCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
        const options = {
          center: initialCenter,
          level: 5
        };

        const map = new window.kakao.maps.Map(containerRef.current, options);
        mapInstanceRef.current = map;

        console.log('[RecordMap] 지도 생성 완료');

        // 지도 크기 강제 재조정
        setTimeout(() => {
          map.relayout();
          if (records.length > 0) {
            const validRecords = records.filter(r => r.lat && r.lng);
            if (validRecords.length > 0) {
              const firstRecord = validRecords[0];
              map.setCenter(new window.kakao.maps.LatLng(firstRecord.lat, firstRecord.lng));
            } else {
              map.setCenter(initialCenter);
            }
          } else {
            map.setCenter(initialCenter);
          }
          console.log('[RecordMap] relayout 완료');
        }, 300);

        setMapLoaded(true);
      });
    };

    tryInit();
  }, []);

  // Update map when records list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps || !mapLoaded) return;

    // Clear existing markers/overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null));
    overlaysRef.current = [];
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }

    // Set new markers
    const validRecords = records.filter(r => r.lat && r.lng);
    const bounds = new window.kakao.maps.LatLngBounds();
    let hasCoords = false;

    validRecords.forEach(record => {
      const position = new window.kakao.maps.LatLng(record.lat, record.lng);
      bounds.extend(position);
      hasCoords = true;

      // Create Custom Overlay for the emotional pin
      const markerContent = document.createElement('div');
      markerContent.className = 'plin-kakao-marker';
      markerContent.style.cursor = 'pointer';
      markerContent.innerHTML = `
        <div class="plin-marker-inner">
          <span>${record.emotion || '🎵'}</span>
          <div class="plin-marker-pulse"></div>
        </div>
      `;

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: position,
        content: markerContent,
        yAnchor: 1.0
      });

      customOverlay.setMap(map);
      overlaysRef.current.push(customOverlay);

      // Create InfoWindow for clicked display
      const infowindow = new window.kakao.maps.InfoWindow({
        position: position,
        content: `
          <div class="${styles.popupContent}" style="padding: 10px; min-width: 140px; font-family: sans-serif; display: flex; flex-direction: column; gap: 4px;">
            <strong style="font-size: 14px; color: #101828; font-weight: 700; display: block; margin: 0;">${record.concertName}</strong>
            <span style="font-size: 12px; color: #667085; display: block; margin: 0;">${record.date}</span>
          </div>
        `,
        removable: true
      });

      // Handle marker click
      markerContent.addEventListener('click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infowindow.open(map);
        activeInfoWindowRef.current = infowindow;
        onSelectRecord(record);
      });
    });

    // Auto fit bounds if not focused on a specific record and we have markers
    if (hasCoords && !focusedRecord) {
      map.setBounds(bounds);
    }
  }, [records, focusedRecord, mapLoaded]);

  // Listen to focusedRecord changes (e.g. from search panel)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps || !mapLoaded) return;

    if (focusedRecord && focusedRecord.lat && focusedRecord.lng) {
      const position = new window.kakao.maps.LatLng(focusedRecord.lat, focusedRecord.lng);
      map.setCenter(position);
      map.setLevel(3); // Zoom in on focused record

      // Also trigger popup open for the focused record
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
      }

      const infowindow = new window.kakao.maps.InfoWindow({
        position: position,
        content: `
          <div class="${styles.popupContent}" style="padding: 10px; min-width: 140px; font-family: sans-serif; display: flex; flex-direction: column; gap: 4px;">
            <strong style="font-size: 14px; color: #101828; font-weight: 700; display: block; margin: 0;">${focusedRecord.concertName}</strong>
            <span style="font-size: 12px; color: #667085; display: block; margin: 0;">${focusedRecord.date}</span>
          </div>
        `,
        removable: true
      });

      infowindow.open(map);
      activeInfoWindowRef.current = infowindow;
    }
  }, [focusedRecord, mapLoaded]);

  // Statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRecords = records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return (
    <div className={styles.mapWrapper}>
      <div
        ref={containerRef}
        id="kakao-map-container"
        className={styles.map}
        style={{
          width: '100%',
          height: '500px',
          minHeight: '300px',
          display: 'block',
          background: '#e0e0e0'
        }}
      />

      {/* Overlays */}
      <div className={styles.mapOverlayTop}>
        <div className={styles.mapStats}>
          <span>📍 {records.length}개 공연</span>
        </div>
      </div>

      <div className={styles.mapOverlayBottom}>
        <div className={styles.monthlyStats}>
          이번 달 기록 <strong>{monthlyRecords.length}개</strong>
        </div>
      </div>
    </div>
  );
}
