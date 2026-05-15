'use client';

import { useState, useRef, useEffect } from 'react';
import { Map, MapMarker } from 'react-kakao-maps-sdk';
import styles from './AddRecordModal.module.css';
import { 
  X, Camera, Calendar, MapPin, 
  CloudRain, Sun, Cloud, Snowflake, Wind,
  Music, Lock, Globe, Check, Plus, Trash2,
  Map as MapIcon, Image as ImageIcon, Flame, Heart, Star
} from 'lucide-react';

const WEATHER_OPTIONS = [
  { id: 'sunny', icon: Sun, label: '맑음' },
  { id: 'cloudy', icon: Cloud, label: '흐림' },
  { id: 'rainy', icon: CloudRain, label: '비' },
  { id: 'snowy', icon: Snowflake, label: '눈' },
  { id: 'windy', icon: Wind, label: '바람' },
];

const PIN_OPTIONS = [
  { id: 'music', icon: Music, label: '음악' },
  { id: 'flame', icon: Flame, label: '열광' },
  { id: 'heart', icon: Heart, label: '감동' },
  { id: 'star', icon: Star, label: '최고' },
];

export default function AddRecordModal({ onClose, onSave, initialData }) {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.566826, lng: 126.978656 });

  useEffect(() => {
    if (isMapOpen && typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setMapReady(true);
      });
    }
  }, [isMapOpen]);

  const handleMapClick = (_t, mouseEvent) => {
    const lat = mouseEvent.latLng.getLat();
    const lng = mouseEvent.latLng.getLng();
    setMapCenter({ lat, lng });
    
    // Reverse geocoding
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const address = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
        set('venue', address);
      }
    });
    set('lat', lat);
    set('lng', lng);
    setIsMapOpen(false);
  };
  const [form, setForm] = useState({
    photos: [],
    concertName: initialData?.name || '',
    artist: initialData?.artist || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    venue: initialData?.venue || '',
    weather: 'sunny',
    memo: '',
    setlist: [],
    isPublic: true,
    tags: initialData?.genre || [],
    pinIcon: 'music'
  });
  
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongArtist, setNewSongArtist] = useState('');
  const [tagInput, setTagInput] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const addSong = () => {
    if (!newSongTitle.trim()) return;
    set('setlist', [...form.setlist, { title: newSongTitle.trim(), artist: newSongArtist.trim() }]);
    setNewSongTitle('');
    setNewSongArtist('');
  };

  const removeSong = (index) => {
    set('setlist', form.setlist.filter((_, i) => i !== index));
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!form.tags.includes(tagInput.trim())) {
        set('tags', [...form.tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    set('tags', form.tags.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!form.concertName || !form.date) {
      alert('공연명과 날짜를 입력해주세요.');
      return;
    }
    if (onSave) onSave(form);
    onClose();
  };

  // Local photo preview
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if (form.photos.length + files.length > 10) {
      alert('사진은 최대 10장까지 업로드할 수 있습니다.');
      return;
    }
    const newPhotos = files.map(file => URL.createObjectURL(file));
    set('photos', [...form.photos, ...newPhotos]);
    // TODO: Supabase Storage 업로드 연동
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.iconBtn} onClick={step === 1 ? onClose : () => setStep(step - 1)}>
            {step === 1 ? <X size={24} color="#101828" /> : <span style={{fontSize:'16px', fontWeight:600}}>이전</span>}
          </button>
          <div className={styles.stepIndicator}>
            {[1, 2, 3].map(s => (
              <div key={s} className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''}`} />
            ))}
          </div>
          <button className={styles.saveTextBtn} onClick={step === 3 ? handleSave : () => setStep(step + 1)}>
            {step === 3 ? '완료' : '다음'}
          </button>
        </div>

        <div className={styles.content}>
          {/* STEP 1: Basic Info & Photos */}
          {step === 1 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>어떤 공연이었나요?</h2>
              
              {/* Photo Upload */}
              <div className={styles.photoUploadArea}>
                <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                  <Camera size={28} color="#98A2B3" />
                  <span className={styles.uploadText}>{form.photos.length}/10</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handlePhotoUpload} 
                />
                <div className={styles.photoScroll}>
                  {form.photos.map((photo, i) => (
                    <div key={i} className={styles.photoPreview}>
                      <img src={photo} alt={`Uploaded ${i}`} />
                      <button className={styles.removePhotoBtn} onClick={() => set('photos', form.photos.filter((_, idx) => idx !== i))}>
                        <X size={14} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>공연명</label>
                <input 
                  className={styles.input} 
                  placeholder="공연 이름을 입력해주세요" 
                  value={form.concertName}
                  onChange={(e) => set('concertName', e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>아티스트</label>
                <input 
                  className={styles.input} 
                  placeholder="참여 아티스트를 입력해주세요" 
                  value={form.artist}
                  onChange={(e) => set('artist', e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>관람 날짜</label>
                {/* Simplified native date picker designed to look like a dial on mobile */}
                <div className={styles.datePickerContainer}>
                  <Calendar size={20} color="#667085" />
                  <input 
                    type="date" 
                    className={styles.dateInput} 
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>장소 (지도 핀 찍기)</label>
                <div className={styles.locationInputArea}>
                  <div className={styles.locationInput}>
                    <MapPin size={20} color="#667085" />
                    <input 
                      className={styles.inputGhost} 
                      placeholder="장소 검색 또는 입력" 
                      value={form.venue}
                      onChange={(e) => set('venue', e.target.value)}
                    />
                  </div>
                  <button className={styles.mapPinBtn} onClick={() => setIsMapOpen(true)}>
                    <MapIcon size={20} color="#0054CB" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Weather, Pin, and Memo */}
          {step === 2 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>그 날의 분위기를 기록하세요</h2>
              
              <div className={styles.fieldGroup}>
                <label className={styles.label}>날씨</label>
                <div className={styles.weatherGrid}>
                  {WEATHER_OPTIONS.map(w => (
                    <button 
                      key={w.id} 
                      className={`${styles.weatherBtn} ${form.weather === w.id ? styles.weatherBtnActive : ''}`}
                      onClick={() => set('weather', w.id)}
                    >
                      <w.icon size={24} color={form.weather === w.id ? "#0054CB" : "#667085"} />
                      <span>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>지도 대표 핀 아이콘</label>
                <div className={styles.pinGrid}>
                  {PIN_OPTIONS.map(p => (
                    <button 
                      key={p.id} 
                      className={`${styles.pinBtn} ${form.pinIcon === p.id ? styles.pinBtnActive : ''}`}
                      onClick={() => set('pinIcon', p.id)}
                    >
                      <p.icon size={24} color={form.pinIcon === p.id ? "#FFFFFF" : "#667085"} fill={form.pinIcon === p.id ? "#FFFFFF" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>상세 후기</label>
                <textarea 
                  className={styles.textarea} 
                  placeholder="오늘 공연에서 가장 기억에 남는 순간은 언제였나요?"
                  value={form.memo}
                  onChange={(e) => set('memo', e.target.value)}
                  rows={5}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>해시태그</label>
                <div className={styles.tagInputArea}>
                  <HashIcon size={18} color="#667085" />
                  <input 
                    className={styles.inputGhost} 
                    placeholder="태그 입력 후 Enter" 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                  />
                </div>
                {form.tags.length > 0 && (
                  <div className={styles.tagList}>
                    {form.tags.map((tag, i) => (
                      <span key={i} className={styles.tagChip}>
                        #{tag}
                        <button className={styles.removeTagBtn} onClick={() => removeTag(i)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Setlist & Settings */}
          {step === 3 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>셋리스트와 설정을 마무리해요</h2>
              
              <div className={styles.fieldGroup}>
                <label className={styles.label}>셋리스트 추가</label>
                <div className={styles.setlistForm}>
                  <input 
                    className={styles.input} 
                    placeholder="노래 제목" 
                    value={newSongTitle}
                    onChange={(e) => setNewSongTitle(e.target.value)}
                  />
                  <input 
                    className={styles.input} 
                    placeholder="가수명 (선택)" 
                    value={newSongArtist}
                    onChange={(e) => setNewSongArtist(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSong()}
                  />
                  <button className={styles.addSongBtn} onClick={addSong}>
                    <Plus size={24} color="#0054CB" />
                  </button>
                </div>
                
                {form.setlist.length > 0 && (
                  <div className={styles.setlistArea}>
                    {form.setlist.map((song, i) => (
                      <div key={i} className={styles.setlistItem}>
                        <div className={styles.setlistNum}>{i + 1}</div>
                        <div className={styles.setlistInfo}>
                          <p className={styles.setlistTitle}>{song.title}</p>
                          {song.artist && <p className={styles.setlistArtist}>{song.artist}</p>}
                        </div>
                        <button className={styles.removeSongBtn} onClick={() => removeSong(i)}>
                          <Trash2 size={18} color="#F04438" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.fieldGroup} style={{ marginTop: 'auto', paddingTop: '24px' }}>
                <div className={styles.toggleArea}>
                  <div className={styles.toggleInfo}>
                    <h3 className={styles.toggleTitle}>
                      {form.isPublic ? <Globe size={18} color="#0054CB" /> : <Lock size={18} color="#667085" />}
                      <span>{form.isPublic ? '전체 공개' : '나만 보기 (비공개)'}</span>
                    </h3>
                    <p className={styles.toggleDesc}>
                      {form.isPublic ? '커뮤니티와 다른 팬들에게 내 기록이 보여집니다.' : '나의 프로필과 지도에서 나만 볼 수 있습니다.'}
                    </p>
                  </div>
                  <label className={styles.switch}>
                    <input 
                      type="checkbox" 
                      checked={form.isPublic} 
                      onChange={(e) => set('isPublic', e.target.checked)} 
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMapOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setIsMapOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '400px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#101828' }}>지도에서 장소 선택</h3>
              <button onClick={() => setIsMapOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><X size={20} color="#101828" /></button>
            </div>
            <div style={{ padding: '16px' }}>
              {!mapReady ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#667085' }}>지도 불러오는 중...</div>
              ) : (
                <Map
                  center={mapCenter}
                  style={{ width: '100%', height: '300px', borderRadius: '8px' }}
                  level={3}
                  onClick={handleMapClick}
                >
                  <MapMarker position={mapCenter} />
                </Map>
              )}
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#667085', textAlign: 'center', marginBottom: 0 }}>지도를 클릭하면 핀이 이동하고 주소가 자동 입력됩니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HashIcon(props) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke={props.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="9" x2="20" y2="9"></line>
      <line x1="4" y1="15" x2="20" y2="15"></line>
      <line x1="10" y1="3" x2="8" y2="21"></line>
      <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
  );
}
