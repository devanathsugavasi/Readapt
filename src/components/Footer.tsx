import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logoWrap}>
            <Image src="/logo.png" alt="Readapt" width={34} height={34} className={styles.logoIcon} />
            <span className={styles.logo}>Readapt</span>
          </Link>
        </div>
        <p className={styles.made}>
          Made for people with ADHD
        </p>
      </div>
    </footer>
  );
}
