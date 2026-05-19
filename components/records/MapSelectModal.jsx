'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './AddRecordModal.module.css';

export default function MapSelectModal({ initialLocation, onConfirm, onClose }) {
  const [tempLocation, setTempLocation] = useState(initialLocation || null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetry = 50;

    const tryInit = () => {
      if (!containerRef.current) {
        console.warn('[MapSelectModal] containerRef가 없습니다.');
        return;
      }

      if (!window.kakao || !window.kakao.maps) {
        retryCount++;
        if (retryCount < maxRetry) {
          setTimeout(tryInit, 200);
        } else {
          console.error('[MapSelectModal] 카카오맵 SDK 로드 실패: 최대 재시도 횟수 초과');
        }
        return;
      }

      window.kakao.maps.load(() => {
        if (!containerRef.current) return;

        console.log('[MapSelectModal] 지도 초기화 시작');
        console.log('[MapSelectModal] 컨테이너 크기:', containerRef.current.offsetWidth, containerRef.current.offsetHeight);

        // Set initial center
        const centerLat = tempLocation ? tempLocation.lat : 37.5665;
        const centerLng = tempLocation ? tempLocation.lng : 126.9780;
        const centerPosition = new window.kakao.maps.LatLng(centerLat, centerLng);

        const options = {
          center: centerPosition,
          level: 4
        };

        const map = new window.kakao.maps.Map(containerRef.current, options);
        mapInstanceRef.current = map;

        console.log('[MapSelectModal] 지도 생성 완료');

        // 지도 크기 강제 재조정
        setTimeout(() => {
          map.relayout();
          map.setCenter(centerPosition);
          console.log('[MapSelectModal] relayout 완료');
        }, 300);

        // Create Geocoder
        const geocoder = new window.kakao.maps.services.Geocoder();

        // If initial location exists, place a marker
        if (tempLocation) {
          const marker = new window.kakao.maps.Marker({
            position: centerPosition,
            map: map
          });
          markerRef.current = marker;
        }

        // Map Click Event
        window.kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
          const latlng = mouseEvent.latLng;
          const lat = latlng.getLat();
          const lng = latlng.getLng();

          setIsGeocoding(true);
          setTempLocation({ lat, lng, address: '주소를 불러오는 중...' });

          // Reverse Geocoding using Kakao services
          geocoder.coord2Address(lng, lat, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const address = result[0].address.address_name;
              setTempLocation({ lat, lng, address });
            } else {
              setTempLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
            }
            setIsGeocoding(false);
          });

          // Update Marker position
          if (markerRef.current) {
            markerRef.current.setPosition(latlng);
          } else {
            const marker = new window.kakao.maps.Marker({
              position: latlng,
              map: map
            });
            markerRef.current = marker;
          }
        });
      });
    };

    tryInit();
  }, []);

  return (
    <div className={styles.mapModalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.mapModalContainer}>
        <div className={styles.mapModalHeader}>
          <h3>장소 선택</h3>
          <button type="button" onClick={onClose}>
            <X size={20} color="#101828" />
          </button>
        </div>
        
        <div className={styles.mapContainerArea}>
          <div 
            ref={containerRef} 
            id="kakao-map-container-select"
            style={{ 
              width: '100%', 
              height: '100%', 
              display: 'block',
              background: '#e0e0e0' 
            }} 
          />
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
