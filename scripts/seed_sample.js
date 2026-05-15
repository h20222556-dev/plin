const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gtdkbavfatdzngtermjf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0ZGtiYXZmYXRkem5ndGVybWpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NjE4MjEsImV4cCI6MjA5NDMzNzgyMX0.lrbCz-CHLa-vAfM8CbbGygb23kq_qPZvHLobl6OgufU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '2a3aa59a-6d4b-41d7-af97-b26bd6e9f29c';

async function createSampleData() {
  console.log('Creating sample data...');

  const { data: perf, error: perfError } = await supabase
    .from('performances')
    .insert([{
      user_id: userId,
      concert_name: '2024 IU H.E.R. WORLD TOUR CONCERT IN SEOUL',
      artist: 'IU (아이유)',
      date: '2024-03-02',
      venue: 'KSPO DOME (올림픽체조경기장)',
      lat: 37.5206,
      lng: 127.1274,
      weather: 'sunny',
      pin_icon: 'heart',
      memo: '아이유의 압도적인 라이브와 화려한 연출... 홀씨 무대가 특히 인상적이었어요! 360도 무대라서 어디서든 잘 보였고 팬서비스도 최고였습니다.',
      setlist: ['홀씨', 'Jam Jam', 'Ah puh', '삐삐', 'Obliviate', 'Celebrity', 'Blueming', '에이트', 'Love wins all'],
      tags: ['아이유', '단독콘서트', '감동', 'KSPO_DOME', 'HER_TOUR'],
      photos: ['https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=1000'],
      is_public: true
    }])
    .select()
    .single();

  if (perfError) {
    console.error('Error creating performance:', perfError.message);
  } else {
    console.log('Performance created:', perf.id);

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert([{
        user_id: userId,
        performance_id: perf.id,
        content: '드디어 다녀온 아이유 콘서트! 셋리스트부터 분위기까지 모든 게 완벽했습니다. 유애나들과 함께 떼창하던 순간이 잊혀지지 않네요. PLIN 지도에 첫 기록을 남겨보니 정말 뿌듯합니다! 💜',
        tags: ['아이유', '후기', 'PLIN', '유애나'],
        likes_count: 0
      }])
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError.message);
    } else {
      console.log('Post created:', post.id);
    }
  }
}

createSampleData();
