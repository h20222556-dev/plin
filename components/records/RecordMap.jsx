'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './RecordMap.module.css';
import { useRecords } from '@/lib/hooks/useRecords';

function createEmojiMarker(map, lat, lng, emoji, onClick) {
  const kakao = window.kakao;
  const container = document.createElement('div')
  container.style.cssText = [
    'position: relative',
    'cursor: pointer',
    'display: flex',
    'flex-direction: column',
    'align-items: center'
  ].join(';')

  const pin = document.createElement('div')
  pin.style.cssText = [
    'width: 48px',
    'height: 48px',
    'background: #2563EB',
    'border-radius: 50% 50% 50% 0',
    'transform: rotate(-45deg)',
    'display: flex',
    'align-items: center',
    'justify-content: center',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.3)'
  ].join(';')

  const emojiSpan = document.createElement('span')
  emojiSpan.style.cssText = [
    'transform: rotate(45deg)',
    'font-size: 22px',
    'line-height: 1'
  ].join(';')
  emojiSpan.textContent = emoji || '🎵'

  pin.appendChild(emojiSpan)
  container.appendChild(pin)
  container.addEventListener('click', onClick)

  const overlay = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(lat, lng),
    content: container,
    yAnchor: 1.0
  })

  overlay.setMap(map)
  return overlay
}

export default function RecordMap({ records, onSelectRecord, onMonthlyStatsClick }) {
  const { focusedRecord } = useRecords();
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [map, setMap] = useState(null);
  const overlaysRef = useRef([]);
  const activeInfoWindowRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // SDK 스크립트 동적 삽입
  useEffect(() => {
    const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!KAKAO_APP_KEY) {
      console.error('[RecordMap] NEXT_PUBLIC_KAKAO_MAP_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해 주세요.');
      return;
    }
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

      const newMap = new window.kakao.maps.Map(containerRef.current, options);
      mapInstanceRef.current = newMap;
      setMap(newMap);

      console.log('[RecordMap] 지도 생성 완료');

      // 지도 크기 강제 재조정 및 초기 핀 렌더링에 맞춘 위치 재조정
      setTimeout(() => {
        newMap.relayout();
        if (records && records.length > 0) {
          const validRecords = records.filter(r => r.lat && r.lng);
          if (validRecords.length > 0) {
            const firstRecord = validRecords[0];
            newMap.setCenter(new window.kakao.maps.LatLng(firstRecord.lat, firstRecord.lng));
          } else {
            newMap.setCenter(initialCenter);
          }
        } else {
          newMap.setCenter(initialCenter);
        }
        console.log('[RecordMap] relayout 완료 (500ms delay)');
      }, 500);
    });
  }, [isLoaded]);

  // Update map when records list changes
  useEffect(() => {
    if (!map || !window.kakao || !window.kakao.maps || !isLoaded) return;

    // Clear existing markers/overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null));
    overlaysRef.current = [];
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }

    // 데이터가 없거나 로딩 중일 때는 핀을 그리지 않음
    if (!records || records.length === 0) return;

    // Set new markers
    const validRecords = records.filter(r => r.lat && r.lng);
    const bounds = new window.kakao.maps.LatLngBounds();
    let hasCoords = false;

    validRecords.forEach(record => {
      const position = new window.kakao.maps.LatLng(record.lat, record.lng);
      bounds.extend(position);
      hasCoords = true;

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

      const customOverlay = createEmojiMarker(
        map,
        record.lat,
        record.lng,
        record.pin_icon || record.pinIcon || '🎵',
        () => {
          if (activeInfoWindowRef.current) {
            activeInfoWindowRef.current.close();
          }
          infowindow.open(map);
          activeInfoWindowRef.current = infowindow;
          onSelectRecord(record);
        }
      );

      overlaysRef.current.push(customOverlay);
    });

    // Auto fit bounds if not focused on a specific record and we have markers
    if (hasCoords && !focusedRecord) {
      map.setBounds(bounds);
    }
  }, [records, focusedRecord, isLoaded, map]);

  // Listen to focusedRecord changes (e.g. from search panel)
  useEffect(() => {
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
  }, [focusedRecord, isLoaded, map]);

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
          height: '100%',
          display: 'block',
          background: '#e0e0e0'
        }}
      />

      <div className={styles.mapOverlayBottom}>
        <div className={styles.monthlyStats} onClick={onMonthlyStatsClick}>
          이번 달 기록 <strong>{monthlyRecords.length}개</strong>
        </div>
      </div>
    </div>
  );
}
