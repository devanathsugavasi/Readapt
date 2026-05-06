'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { countWords } from '@/lib/adaptEngine';
import { READING_TEXT_KEY } from '@/lib/readingSession';
import styles from './page.module.css';

const SAMPLE_PASTE_TEXT = `Stars are luminous, giant spheres of hot plasma—primarily hydrogen and helium—that generate their own energy through nuclear fusion in their cores, a process that powers them for millions to billions of years and makes them the primary sources of light and heat in the universe. They are born from vast clouds of gas and dust that collapse under gravity, and their properties vary widely in size, mass, temperature, and luminosity, shaping the diversity of stellar types such as red dwarfs, massive blue stars, and white dwarfs. The Sun, our closest star, sustains life on Earth by providing energy, and like all stars, it follows a life cycle in which it will eventually exhaust its nuclear fuel, expand into a red giant, and later shed its outer layers, leaving behind a dense white dwarf core. Some stars, particularly the most massive ones, end their lives in cataclysmic explosions called supernovae, which scatter heavy elements into space and can collapse into neutron stars or black holes. A black hole is an extraordinary region of space where matter is compressed so densely that its gravitational pull becomes so strong even light cannot escape once it crosses the event horizon, effectively making the black hole invisible except through its gravitational influence on surrounding matter. They form from the collapse of massive stars and exist in different scales, from stellar-mass black holes to supermassive black holes that reside at the centers of galaxies, including the Milky Way. These enigmatic objects warp spacetime itself, consume nearby gas and dust, and power energetic phenomena such as quasars, making their study crucial for understanding cosmic evolution. In contrast, a white hole is a purely theoretical concept described by general relativity as the opposite of a black hole, where matter, light, and energy can only flow outward, with nothing ever entering it. Though no evidence of white holes has been observed, they are often speculated about in physics as potential counterparts to black holes, sometimes imagined as connected through wormholes that could bridge distant regions of space and time, or even as hypothetical endpoints of black hole evaporation through Hawking radiation. While black holes are accepted as real, observable cosmic entities, white holes remain in the realm of theory, yet their study fuels profound questions about the nature of spacetime, the limits of physics, and the ultimate fate of the universe.`;

function PastePageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const presetFromQuery = params.get('preset') || 'B';

  const [rawText, setRawText] = useState('');

  const wordCount = useMemo(() => countWords(rawText), [rawText]);
  const canContinue = wordCount >= 50;

  const continueToAdapt = () => {
    if (!canContinue) return;
    localStorage.setItem(READING_TEXT_KEY, rawText);
    router.push(`/adapt?preset=${presetFromQuery}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href="/dashboard" className={styles.logo}>
          <Image src="/logo.png" alt="Readapt" width={34} height={34} className={styles.logoIcon} priority />
          <span>Readapt</span>
        </Link>

        <h1 className={styles.heading}>Paste what you want to read.</h1>
        <p className={styles.sub}>An article, your assignment, a work email — anything.</p>

        <textarea
          id="paste-textarea"
          className={styles.textarea}
          placeholder="Paste your text here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={11}
        />

        <div className={styles.controls}>
          <span className={styles.wordCount}>
            {wordCount} word{wordCount !== 1 ? 's' : ''}
            {!canContinue && wordCount > 0 && <span className={styles.wordHint}> — need at least 50</span>}
          </span>
          <div className={styles.buttonRow}>
            <button className="btn btn-ghost" onClick={() => setRawText(SAMPLE_PASTE_TEXT)}>
              Use sample text
            </button>
            <button className={`btn btn-primary ${!canContinue ? styles.btnDisabled : ''}`} disabled={!canContinue} onClick={continueToAdapt}>
              Continue →
            </button>
          </div>
        </div>

        <p className={styles.note}>Your text is never stored on our server.</p>
      </div>
    </div>
  );
}

export default function PastePage() {
  return (
    <Suspense>
      <PastePageContent />
    </Suspense>
  );
}
