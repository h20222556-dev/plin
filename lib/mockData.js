export const MOCK_RECORDS = [
  {
    id: 'mock-rec-1',
    userId: 'demo-user',
    concertName: 'IVE THE 1ST WORLD TOUR <SHOW WHAT I HAVE>',
    artist: 'IVE (아이브)',
    date: '2023-10-07',
    venue: '잠실실내체육관',
    lat: 37.5148,
    lng: 127.0759,
    weather: '☀️맑음',
    pinIcon: '✨',
    memo: '첫 월드투어의 시작! 멤버들의 에너지가 대단했다. 특히 I AM 라이브는 소름 돋을 정도...',
    setlist: ['I AM', 'ROYAL', 'Blue Blood', 'Blue Heart', 'Cherish', 'ELEVEN'],
    tags: ['아이브', 'IVE', '첫콘', '잠실'],
    photos: [],
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-rec-2',
    userId: 'demo-user',
    concertName: 'Bruno Mars Live in Seoul',
    artist: 'Bruno Mars',
    date: '2023-06-18',
    venue: '잠실종합운동장 올림픽주경기장',
    lat: 37.5158,
    lng: 127.0729,
    weather: '☁️흐림',
    pinIcon: '🎸',
    memo: '내 인생 최고의 팝스타 내한 공연. Versace on the Floor 떼창은 평생 잊지 못할 듯.',
    setlist: ['24K Magic', 'Finesse', 'Treasure', 'Versace on the Floor', 'Uptown Funk'],
    tags: ['브루노마스', '내한공연', '현대카드슈퍼콘서트'],
    photos: [],
    isPublic: true,
    createdAt: new Date().toISOString(),
  }
];

export const MOCK_POSTS = [
  {
    id: 'mock-post-1',
    content: '어제 아이브 콘서트 다녀오신 분 계신가요? 셋리스트 구성 진짜 미친 것 같아요 ㅠㅠ 특히 밴드 라이브 버전 I AM은 역대급이었습니다.',
    emotion: '🔥',
    tags: ['아이브', '콘서트후기', 'IVE'],
    likes: 42,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isLiked: false,
    author: {
      id: 'demo-user-2',
      nickname: '안유진진자라',
      profileEmoji: '🐶',
      bio: '아이브에 진심인 편',
      isPublic: true,
    },
    concert: 'IVE THE 1ST WORLD TOUR',
    comments: 5,
  },
  {
    id: 'mock-post-2',
    content: '다음 달 브루노 마스 내한 때 드레스코드 뭐로 하실 건가요? 저는 역시 실크 셔츠가 제일 무난할 것 같은데 추천 좀 해주세요!',
    emotion: '🕺',
    tags: ['브루노마스', '내한', '패션'],
    likes: 12,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isLiked: true,
    author: {
      id: 'demo-user-3',
      nickname: 'MarsLover',
      profileEmoji: '🕶️',
      bio: 'Funk forever',
      isPublic: true,
    },
    concert: 'Bruno Mars Live in Seoul',
    comments: 8,
  }
];

export const MOCK_CHATS = [
  {
    roomId: 'mock-room-1',
    recipientId: 'demo-user-2',
    recipientNickname: '안유진진자라',
    recipientEmoji: '🐶',
    lastMessage: '네! 굿즈 줄 진짜 길더라고요 ㅋㅋ',
    lastMessageAt: new Date(Date.now() - 10000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    unread: 2,
    messages: [
      { id: 'm1', senderId: 'demo-user-2', text: '혹시 어제 굿즈 사셨나요?', createdAt: new Date(Date.now() - 60000).toISOString() },
      { id: 'm2', senderId: 'demo-user', text: '아뇨 줄이 너무 길어서 포기했어요 ㅠㅠ', createdAt: new Date(Date.now() - 30000).toISOString() },
      { id: 'm3', senderId: 'demo-user-2', text: '네! 굿즈 줄 진짜 길더라고요 ㅋㅋ', createdAt: new Date(Date.now() - 10000).toISOString() },
    ]
  },
  {
    roomId: 'mock-room-2',
    recipientId: 'demo-user-4',
    recipientNickname: '종료된대화',
    recipientEmoji: '⌛',
    lastMessage: '즐거운 관람 되셨길 바라요!',
    lastMessageAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 만료됨
    unread: 0,
    messages: [
      { id: 'm4', senderId: 'demo-user-4', text: '즐거운 관람 되셨길 바라요!', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    ]
  }
];

export const MOCK_PERFORMANCES = [
  { 
    id: 1, 
    name: '2024 IU H.E.R. WORLD TOUR CONCERT', 
    artist: '아이유 (IU)', 
    date: '2024-03-02', 
    time: '18:00',
    venue: 'KSPO DOME', 
    status: 'upcoming',
    genre: ['K-Pop', 'Solo'],
    price: '165,000원',
    ticketingUrl: 'https://tickets.interpark.com/',
    isBookmarked: false,
    reviewCount: 12
  },
  { 
    id: 2, 
    name: 'SEVENTEEN TOUR ‘FOLLOW’ AGAIN TO SEOUL', 
    artist: '세븐틴', 
    date: '2024-04-27', 
    time: '19:00',
    venue: '서울월드컵경기장', 
    status: 'upcoming',
    genre: ['K-Pop', 'Group'],
    price: '154,000원',
    ticketingUrl: 'https://tickets.interpark.com/',
    isBookmarked: true,
    reviewCount: 45
  },
  { 
    id: 3, 
    name: 'Ed Sheeran +-=÷x Tour in Seoul', 
    artist: 'Ed Sheeran', 
    date: '2024-02-16', 
    time: '20:00',
    venue: '잠실주경기장', 
    status: 'sold_out',
    genre: ['Pop', 'Solo'],
    price: '132,000원',
    ticketingUrl: 'https://tickets.interpark.com/',
    isBookmarked: false,
    reviewCount: 0
  },
  { 
    id: 4, 
    name: 'IVE THE 1ST WORLD TOUR <SHOW WHAT I HAVE>', 
    artist: '아이브', 
    date: '2023-10-07', 
    time: '18:00',
    venue: '잠실실내체육관', 
    status: 'sold_out',
    genre: ['K-Pop', 'Group'],
    price: '154,000원',
    ticketingUrl: 'https://tickets.interpark.com/',
    isBookmarked: false,
    reviewCount: 8
  },
];

export const emotionOptions = [
  { emoji: '🔥', label: '열정적' },
  { emoji: '🥰', label: '행복' },
  { emoji: '😭', label: '감동' },
  { emoji: '🤩', label: '전율' },
  { emoji: '🕺', label: '신남' },
  { emoji: '✨', label: '황홀' },
  { emoji: '🫶', label: '사랑' },
  { emoji: '👏', label: '최고' },
];
