'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import styles from './AddRecordModal.module.css';

// Leaflet 기본 아이콘 깨짐 방지
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

// 지도 클릭 이벤트 처리 컴포넌트
function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapSelectModal({ initialLocation, onConfirm, onClose }) {
  const [tempLocation, setTempLocation] = useState(initialLocation || null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    fixLeafletIcon();
  }, []);

  const handleMapClick = async (lat, lng) => {
    setIsGeocoding(true);
    setTempLocation({ lat, lng, address: '주소를 불러오는 중...' });
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ko`);
      const data = await res.json();
      if (data && data.display_name) {
        setTempLocation({ lat, lng, address: data.display_name });
      } else {
        setTempLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
      setTempLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className={styles.mapModalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.mapModalContainer}>
        <div className={styles.mapModalHeader}>
          <h3>장소 선택</h3>
          <button type="button" onClick={onClose}><X size={20} color="#101828" /></button>
        </div>
        
        <div className={styles.mapContainerArea}>
          <MapContainer 
            center={tempLocation ? [tempLocation.lat, tempLocation.lng] : [37.5665, 126.9780]} 
            zoom={15} 
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler onClick={handleMapClick} />
            {tempLocation && <Marker position={[tempLocation.lat, tempLocation.lng]} />}
          </MapContainer>
        </div>

        <div className={styles.mapModalFooter}>
          <div className={styles.selectedAddress}>
            {tempLocation ? (
              <span>📍 {tempLocation.address}</span>
            ) : (
              <span style={{ color: '#98A2B3' }}>지도를 클릭하여 장소를 선택해주세요.</span>
            )}
          </div>
          <button 
            type="button"
            className={styles.confirmBtn} 
            disabled={!tempLocation || isGeocoding}
            onClick={() => onConfirm(tempLocation)}
          >
            {isGeocoding ? '주소 확인 중...' : '이 위치로 선택'}
          </button>
        </div>
      </div>
    </div>
  );
}
