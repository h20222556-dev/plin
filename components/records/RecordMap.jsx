'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './RecordMap.module.css';
import { useRecords } from '@/lib/hooks/useRecords';

// Leaflet 기본 아이콘 깨짐 방지 (useEffect 내에서 처리 권장)
const fixLeafletIcon = () => {
  if (typeof window !== 'undefined') {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }
};

// 지도 중심 이동 핸들러 컴포넌트
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function RecordMap({ records, onSelectRecord }) {
  const { focusedRecord } = useRecords();
  const [center, setCenter] = useState([37.5665, 126.9780]);
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  // Listen to focusedRecord from unified search
  useEffect(() => {
    if (focusedRecord && focusedRecord.lat && focusedRecord.lng) {
      setCenter([focusedRecord.lat, focusedRecord.lng]);
      setZoom(15);
    }
  }, [focusedRecord]);

  useEffect(() => {
    if (records.length > 0 && !focusedRecord) {
      const validRecords = records.filter(r => r.lat && r.lng);
      if (validRecords.length > 0) {
        setCenter([validRecords[0].lat, validRecords[0].lng]);
      }
    }
  }, [records, focusedRecord]);

  // 커스텀 마커 아이콘 생성 함수
  const createCustomIcon = (emotion) => {
    return L.divIcon({
      className: 'plin-leaflet-marker',
      html: `
        <div class="plin-marker-inner">
          <span>${emotion || '🎵'}</span>
          <div class="plin-marker-pulse"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  };

  // 이번 달 기록 개수 계산
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRecords = records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return (
    <div className={styles.mapWrapper}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        className={styles.map}
        zoomControl={true}
      >
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {records.map((record) => {
          if (!record.lat || !record.lng) return null;
          
          return (
            <Marker 
              key={record.id} 
              position={[record.lat, record.lng]}
              icon={createCustomIcon(record.emotion)}
              eventHandlers={{
                click: () => onSelectRecord(record),
              }}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <strong>{record.concertName}</strong>
                  <span>{record.date}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

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

      <style jsx global>{`
        .plin-leaflet-marker {
          background: none;
          border: none;
        }
        .plin-marker-inner {
          position: relative;
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #0054CB, #3B82F6);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,84,203,0.3);
        }
        .plin-marker-inner span {
          transform: rotate(45deg);
          font-size: 18px;
        }
        .plin-marker-pulse {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(0,84,203,0.2);
          border-radius: 50%;
          animation: markerPulse 2s ease-out infinite;
          z-index: -1;
        }
        @keyframes markerPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 12px;
          min-width: 120px;
        }
      `}</style>
    </div>
  );
}
