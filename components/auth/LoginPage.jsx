'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import styles from './LoginPage.module.css';
import { Music, Mail, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const { login, signup, loginWithGoogle, enterDemoMode } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!nickname.trim()) throw new Error('닉네임을 입력해주세요.');
        await signup(email, password, nickname.trim());
      }
    } catch (err) {
      setError(err.message || '인증 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || '구글 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoCircle}>
            <Music size={48} color="white" />
          </div>
          <h1 className={styles.logoText}>PLIN</h1>
          <p className={styles.tagline}>나만의 공연 기록을 남기고<br/>공연 메이트를 만나세요</p>
        </div>

        {/* Action Area */}
        <div className={styles.actionCard}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {!isLogin && (
              <div className={styles.inputGroup}>
                <User size={20} color="#667085" />
                <input 
                  type="text" 
                  placeholder="닉네임" 
                  className={styles.input}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            
            <div className={styles.inputGroup}>
              <Mail size={20} color="#667085" />
              <input 
                type="email" 
                placeholder="이메일 주소" 
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <Lock size={20} color="#667085" />
              <input 
                type="password" 
                placeholder="비밀번호 (6자 이상)" 
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '처리 중...' : (isLogin ? '이메일로 로그인' : '회원가입')}
            </button>
          </form>

          <div className={styles.divider}>
            <span>또는</span>
          </div>

          <button 
            type="button"
            className={styles.googleBtn} 
            onClick={handleGoogleLogin} 
            disabled={loading}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className={styles.googleIcon} 
            />
            <span>Google 간편 로그인</span>
          </button>

          <div className={styles.toggleText}>
            <span>{isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}</span>
            <button 
              type="button" 
              className={styles.toggleBtn}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '회원가입' : '로그인하기'}
            </button>
          </div>

          <div className={styles.divider}>
            <span>또는</span>
          </div>

          <button 
            type="button"
            className={styles.demoBtn}
            onClick={() => enterDemoMode()}
          >
            데모로 사용해보기
          </button>
        </div>

        <p className={styles.terms}>
          계속하면 PLIN의 <span className={styles.linkText}>이용약관</span> 및{' '}
          <span className={styles.linkText}>개인정보처리방침</span>에 동의합니다
        </p>
      </div>
    </div>
  );
}
