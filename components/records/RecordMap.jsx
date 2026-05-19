'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './RecordMap.module.css';
import { useRecords } from '@/lib/hooks/useRecords';

export default function RecordMap({ records, onSelectRecord }) {
  const { focusedRecord } = useRecords();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);
  const activeInfoWindowRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Kakao Map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (!window.kakao || !window.kakao.maps) {
        console.error('카카오맵 SDK가 로드되지 않았습니다.');
        return;
      }

      window.kakao.maps.load(() => {
        // Default center: Seoul City Hall
        const initialCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
        const options = {
          center: initialCenter,
          level: 5
        };

        const map = new window.kakao.maps.Map(mapRef.current, options);
        mapInstanceRef.current = map;
        setMapLoaded(true);

        // Adjust map center if records are available
        if (records.length > 0) {
          const validRecords = records.filter(r => r.lat && r.lng);
          if (validRecords.length > 0) {
            const firstRecord = validRecords[0];
            map.setCenter(new window.kakao.maps.LatLng(firstRecord.lat, firstRecord.lng));
          }
        }
      });
    };

    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      const script = document.getElementById('kakao-map-sdk');
      if (script) {
        script.addEventListener('load', initMap);
        return () => {
          script.removeEventListener('load', initMap);
        };
      }
    }
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
      <div ref={mapRef} className={styles.map} />

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
