'use client';

import { useState, useEffect } from 'react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import styles from './RecordMap.module.css';

export default function RecordMap({ records, onSelectRecord }) {
  const [mapReady, setMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [mapLevel, setMapLevel] = useState(8); // 카카오 지도 레벨 (리플렛과 반비례, 낮을수록 확대)

  useEffect(() => {
    // SDK가 로드되었는지 확인 후 초기화
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setMapReady(true);
      });
    }
  }, []);

  useEffect(() => {
    // 레코드가 있으면 첫 번째 레코드 위치로 중심 이동 (또는 Bounds 계산 가능)
    if (mapReady && records.length > 0) {
      const validRecords = records.filter(r => r.lat && r.lng);
      if (validRecords.length > 0) {
        setMapCenter({ lat: validRecords[0].lat, lng: validRecords[0].lng });
      }
    }
  }, [records, mapReady]);

  if (!mapReady) {
    return (
      <div className={styles.mapWrapper}>
        <div className={styles.map} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          지도를 불러오는 중...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mapWrapper}>
      <Map
        center={mapCenter}
        level={mapLevel}
        className={styles.map}
        style={{ width: '100%', height: '100%' }}
      >
        {records.map((record) => {
          if (!record.lat || !record.lng) return null;
          
          return (
            <CustomOverlayMap
              key={record.id}
              position={{ lat: record.lat, lng: record.lng }}
              yAnchor={1} // 마커 끝부분을 기준점으로
            >
              <div 
                className="plin-marker-container"
                onClick={() => onSelectRecord(record)}
              >
                <div className="plin-marker">
                  <div className="plin-marker-inner">
                    <span>{record.emotion || '🎵'}</span>
                  </div>
                  <div className="plin-marker-pulse"></div>
                </div>
                <div className="plin-popup">
                  <strong>{record.concertName}</strong>
                  <span>{record.date}</span>
                </div>
              </div>
            </CustomOverlayMap>
          );
        })}
      </Map>
      <style>{`
        .plin-marker-container {
          position: relative;
          cursor: pointer;
        }
        .plin-marker {
          position: relative;
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
        }
        .plin-marker-inner {
          position: absolute;
          top: 0; left: 0;
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #2855D4, #5B7FF5);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(40,85,212,0.35);
        }
        .plin-marker-inner span {
          transform: rotate(45deg);
          font-size: 18px;
          display: block;
        }
        .plin-marker-pulse {
          position: absolute;
          top: 0; left: 0;
          width: 40px; height: 40px;
          background: rgba(40,85,212,0.25);
          border-radius: 50%;
          animation: markerPulse 2s ease-out infinite;
        }
        @keyframes markerPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .plin-popup {
          background: white;
          padding: 8px 12px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          text-align: center;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .plin-marker-container:hover .plin-popup {
          opacity: 1;
        }
        .plin-popup strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1A1A2E;
          margin-bottom: 4px;
        }
        .plin-popup span {
          font-size: 11px;
          color: #8A8AAA;
        }
      `}</style>

      {/* Record count overlay */}
      <div className={styles.mapOverlay}>
        <div className={styles.mapStats}>
          <span>📍 {records.length}개 공연</span>
        </div>
      </div>
    </div>
  );
}
