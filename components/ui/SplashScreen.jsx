'use client';

import styles from './SplashScreen.module.css';

export default function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.logo}>
        <span className={styles.logoText}>PLIN</span>
        <div className={styles.logoGlow} />
      </div>
      <div className={styles.loader}>
        <div className={styles.loaderBar} />
      </div>
    </div>
  );
}
