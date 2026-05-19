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
  const [isLoaded, setIsLoaded] = useState(false);

  // SDK 스크립트 동적 삽입
  useEffect(() => {
    const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (document.getElementById('kakao-map-sdk')) {
      if (window.kakao && window.kakao.maps) {
        setIsLoaded(true);
      } else {
        const handleLoad = () => setIsLoaded(true);
        const script = document.getElementById('kakao-map-sdk');
        script.addEventListener('load', handleLoad);
        return () => {
          script.removeEventListener('load', handleLoad);
        };
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'kakao-map-sdk';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error('[RecordMap] SDK 로드 실패. appkey와 도메인 설정을 확인하세요.');
    document.head.appendChild(script);
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded) return;
    if (!containerRef.current) {
      console.warn('[RecordMap] containerRef가 없습니다.');
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
      }, 100);
    });
  }, [isLoaded]);

  // Update map when records list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps || !isLoaded) return;

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
  }, [records, focusedRecord, isLoaded]);

  // Listen to focusedRecord changes (e.g. from search panel)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps || !isLoaded) return;

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
  }, [focusedRecord, isLoaded]);

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
