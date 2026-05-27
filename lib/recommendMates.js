import { supabase } from './supabase';

/**
 * 두 좌표 사이의 거리를 계산하는 Haversine 공식 (단위: km)
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * AI 공연 메이트 추천 리스트를 가져오는 함수
 * @param {string} currentUserId 
 * @returns {Promise<Array>} recommended mates
 */
export async function getRecommendedMates(currentUserId) {
  if (!currentUserId) return [];

  try {
    // 1. 차단한 유저 ID 목록 가져오기
    const { data: blockedData, error: blockedError } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', currentUserId);

    if (blockedError) {
      console.error('차단 유저 목록 조회 실패:', blockedError.message);
    }
    const blockedUserIds = new Set((blockedData || []).map(b => b.blocked_id));

    // 2. 다른 모든 유저 정보 가져오기 (자기 자신 및 차단한 유저 제외)
    const { data: otherUsers, error: otherUsersError } = await supabase
      .from('users')
      .select('id, nickname, profile_emoji, avatar_url')
      .neq('id', currentUserId);

    if (otherUsersError) {
      console.error('유저 목록 조회 실패:', otherUsersError.message);
      return [];
    }

    const filteredUsers = (otherUsers || []).filter(u => !blockedUserIds.has(u.id));

    // 3. 모든 공연 기록 로드
    const { data: allPerfs, error: allPerfsError } = await supabase
      .from('performances')
      .select('id, user_id, artist, lat, lng');

    if (allPerfsError) {
      console.error('공연 목록 조회 실패:', allPerfsError.message);
      return [];
    }

    // 4. 내 공연 정보 추출 및 세트화
    const myPerfs = (allPerfs || []).filter(p => p.user_id === currentUserId);
    const myPerfIds = new Set(myPerfs.map(p => p.id));
    const myArtists = new Set(myPerfs.map(p => p.artist).filter(Boolean));
    const myPins = myPerfs
      .map(p => ({ lat: p.lat, lng: p.lng }))
      .filter(p => p.lat !== null && p.lat !== undefined && p.lng !== null && p.lng !== undefined);

    // 5. 다른 유저들의 공연 정보를 유저별로 그룹화
    const otherPerfsByUser = {};
    (allPerfs || []).forEach(p => {
      if (p.user_id === currentUserId || blockedUserIds.has(p.user_id)) return;
      if (!otherPerfsByUser[p.user_id]) {
        otherPerfsByUser[p.user_id] = [];
      }
      otherPerfsByUser[p.user_id].push(p);
    });

    const recommendedList = [];

    // 6. 유사도 평가 루프
    for (const otherUser of filteredUsers) {
      const otherUserPerfs = otherPerfsByUser[otherUser.id] || [];
      let score = 0;
      const reasons = [];

      // A. 같은 공연을 함께 본 횟수 (+3점)
      const sharedPerfIds = otherUserPerfs.filter(p => myPerfIds.has(p.id));
      if (sharedPerfIds.length > 0) {
        score += sharedPerfIds.length * 3;
        reasons.push(`같은 공연을 ${sharedPerfIds.length}번 함께 봤어요`);
      }

      // B. 같은 아티스트 팬 여부 (+2점)
      const otherArtists = new Set(otherUserPerfs.map(p => p.artist).filter(Boolean));
      const sharedArtists = [...myArtists].filter(artist => otherArtists.has(artist));
      if (sharedArtists.length > 0) {
        score += sharedArtists.length * 2;
        sharedArtists.forEach(artistName => {
          reasons.push(`같은 아티스트 ${artistName}의 팬이에요`);
        });
      }

      // C. 1km 이내에 핀 좌표 존재 여부 (+1점)
      const otherPins = otherUserPerfs
        .map(p => ({ lat: p.lat, lng: p.lng }))
        .filter(pin => pin.lat !== null && pin.lat !== undefined && pin.lng !== null && pin.lng !== undefined);

      let hasNearLocation = false;
      for (const myPin of myPins) {
        for (const otherPin of otherPins) {
          const dist = getDistanceKm(myPin.lat, myPin.lng, otherPin.lat, otherPin.lng);
          if (dist <= 1.0) {
            hasNearLocation = true;
            break;
          }
        }
        if (hasNearLocation) break;
      }

      if (hasNearLocation) {
        score += 1;
        reasons.push('비슷한 장소에서 공연을 즐겨요');
      }

      // 점수가 0점보다 큰 경우 추천 목록 추가
      if (score > 0) {
        recommendedList.push({
          userId: otherUser.id,
          nickname: otherUser.nickname,
          profile_emoji: otherUser.profile_emoji || '🧑‍🎤',
          avatar_url: otherUser.avatar_url || null,
          score,
          reasons
        });
      }
    }

    // 7. 점수 기준 내림차순 정렬 후 상위 10명 반환
    recommendedList.sort((a, b) => b.score - a.score);
    return recommendedList.slice(0, 10);
  } catch (err) {
    console.error('getRecommendedMates 실행 중 에러:', err);
    return [];
  }
}
