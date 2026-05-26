'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './AddRecordModal.module.css';

export default function MapSelectModal({ initialLocation, initialSearchKeyword, onConfirm, onClose }) {
  const [tempLocation, setTempLocation] = useState(initialLocation || null);
  const [searchResults, setSearchResults] = useState([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleSearchResultClick = (result) => {
    if (!window.kakao || !mapInstanceRef.current) return;
    const lat = parseFloat(result.y);
    const lng = parseFloat(result.x);
    const address = result.place_name;
    const newPos = new window.kakao.maps.LatLng(lat, lng);
    
    mapInstanceRef.current.setCenter(newPos);
    
    if (markerRef.current) {
      markerRef.current.setPosition(newPos);
    } else {
      const marker = new window.kakao.maps.Marker({
        position: newPos,
        map: mapInstanceRef.current
      });
      markerRef.current = marker;
    }
    
    setTempLocation({ lat, lng, address });
  };

  // SDK 스크립트 동적 삽입
  useEffect(() => {
    const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!KAKAO_APP_KEY) {
      console.error('[MapSelectModal] NEXT_PUBLIC_KAKAO_MAP_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해 주세요.');
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
    script.onerror = () => console.error('[MapSelectModal] SDK 로드 실패. appkey와 도메인 설정을 확인하세요.');
    document.head.appendChild(script);
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded) return;
    if (!containerRef.current) {
      console.warn('[MapSelectModal] containerRef가 없습니다.');
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
      }, 100);

      // Create Geocoder
      const geocoder = new window.kakao.maps.services.Geocoder();

      // If keyword exists, search for places
      if (initialSearchKeyword) {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(initialSearchKeyword, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) {
            setSearchResults(result);
            const firstResult = result[0];
            const searchPosition = new window.kakao.maps.LatLng(firstResult.y, firstResult.x);
            map.setCenter(searchPosition);

            // Place a marker
            if (markerRef.current) {
              markerRef.current.setPosition(searchPosition);
            } else {
              const marker = new window.kakao.maps.Marker({
                position: searchPosition,
                map: map
              });
              markerRef.current = marker;
            }

            setTempLocation({
              lat: parseFloat(firstResult.y),
              lng: parseFloat(firstResult.x),
              address: firstResult.place_name
            });
          }
        });
      } else if (tempLocation) {
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
  }, [isLoaded]);

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
          {searchResults.length > 0 && (
            <div className={styles.searchResultList}>
              {searchResults.map((result, idx) => (
                <div 
                  key={idx} 
                  className={styles.searchResultItem}
                  onClick={() => handleSearchResultClick(result)}
                >
                  <span className={styles.placeName}>{result.place_name}</span>
                  <span className={styles.addressName}>{result.address_name || result.road_address_name}</span>
                </div>
              ))}
            </div>
          )}
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
