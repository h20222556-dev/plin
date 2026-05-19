'use client';

import { useEffect, useRef } from 'react';

export default function KakaoMap({
  pins = [],
  onLocationSelect,
  selectedLat,
  selectedLng
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetry = 50;

    const tryInit = () => {
      if (!containerRef.current) {
        console.warn('[KakaoMap] containerRef가 없습니다.');
        return;
      }

      if (!window.kakao || !window.kakao.maps) {
        retryCount++;
        if (retryCount < maxRetry) {
          setTimeout(tryInit, 200);
        } else {
          console.error('[KakaoMap] 카카오맵 SDK 로드 실패: 최대 재시도 횟수 초과');
        }
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

        console.log('[KakaoMap] 지도 생성 완료');

        // 지도 크기 강제 재조정
        setTimeout(() => {
          map.relayout();
          map.setCenter(center);
          console.log('[KakaoMap] relayout 완료');
        }, 300);

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
    };

    tryInit();
  }, [pins, selectedLat, selectedLng, onLocationSelect]);

  return (
    <div
      ref={containerRef}
      id="kakao-map-container"
      style={{
        width: '100%',
        height: '500px',
        minHeight: '300px',
        display: 'block',
        background: '#e0e0e0'
      }}
    />
  );
}
