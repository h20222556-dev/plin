'use client';

import { useEffect, useRef, useState } from 'react';

export default function KakaoMap({
  pins = [],
  onLocationSelect,
  selectedLat,
  selectedLng
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // SDK 스크립트 동적 삽입
  useEffect(() => {
    const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!KAKAO_APP_KEY) {
      console.error('[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_KEY 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해 주세요.');
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
    script.onerror = () => console.error('[KakaoMap] SDK 로드 실패. appkey와 도메인 설정을 확인하세요.');
    document.head.appendChild(script);
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded) return;
    if (!containerRef.current) {
      console.warn('[KakaoMap] containerRef가 없습니다.');
      return;
    }

    window.kakao.maps.load(() => {
      if (!containerRef.current) return;

      console.log('[KakaoMap] 지도 초기화 시작');
      console.log('[KakaoMap] 컨테이너 크기:', containerRef.current.offsetWidth, containerRef.current.offsetHeight);

      const center = new window.kakao.maps.LatLng(
        selectedLat ?? 37.5665,
        selectedLng ?? 126.9780
      );

      const options = {
        center,
        level: 5
      };

      const map = new window.kakao.maps.Map(containerRef.current, options);
      mapRef.current = map;

      console.log('[KakaoMap] 지도 생성 완료');

      // 지도 크기 강제 재조정
      setTimeout(() => {
        map.relayout();
        map.setCenter(center);
        console.log('[KakaoMap] relayout 완료');
      }, 100);

      // 위치 선택 클릭 이벤트
      if (onLocationSelect) {
        window.kakao.maps.event.addListener(map, 'click', (e) => {
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(lng, lat, (result, status) => {
            const address =
              status === window.kakao.maps.services.Status.OK
                ? result[0].address.address_name
                : '';
            onLocationSelect(lat, lng, address);
          });
          new window.kakao.maps.Marker({ position: e.latLng, map });
        });
      }

      // 핀 표시
      pins.forEach(pin => {
        if (!pin.lat || !pin.lng) return;
        const pos = new window.kakao.maps.LatLng(pin.lat, pin.lng);
        const marker = new window.kakao.maps.Marker({ position: pos, map });
        if (pin.title) {
          const info = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:6px 10px;font-size:13px;white-space:nowrap;">${pin.title}</div>`
          });
          window.kakao.maps.event.addListener(marker, 'click', () => {
            info.open(map, marker);
          });
        }
      });
    });
  }, [isLoaded, pins, selectedLat, selectedLng, onLocationSelect]);

  return (
    <div
      ref={containerRef}
      id="kakao-map-container"
      style={{
        width: '100%',
        height: '500px',
        minHeight: '300px',
        display: 'block',
        background: '#f0f0f0'
      }}
    />
  );
}
