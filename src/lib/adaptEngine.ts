// ─────────────────────────────────────────────────────────────────
// Readapt Text Adaptation Engine
// Implements all techniques from DPR §8 — Bionic Reading, Chunking,
// Focus Line, Sentence Reveal, and Preset configurations A / B / C
// ─────────────────────────────────────────────────────────────────

export type PresetId = 'A' | 'B' | 'C';

export interface PresetConfig {
  id: PresetId;
  label: string;
  profileName: string;
  description: string;
  bionicIntensity: number;    // 0–1 fraction of word to bold
  lineHeight: number;
  letterSpacing: string;
  wordSpacing: string;
  maxWidth: string;
  paragraphSpacing: string;
  fontSize: number;           // px
  focusLine: boolean;
  focusLineOpacity: number;
  sentenceChunking: boolean;
  maxChunkWords: number;
  sentenceReveal: boolean;
}

export const PRESETS: Record<PresetId, PresetConfig> = {
  A: {
    id: 'A',
    label: 'Mild Focus Profile',
    profileName: 'Mild Focus Profile',
    description:
      "Your reading profile shows you can usually follow text, but you may find long or dense content mentally tiring. Readapt's Preset A adds just enough structure to reduce cognitive load without changing too much.",
    bionicIntensity: 0.40,
    lineHeight: 1.80,
    letterSpacing: '0.029em',
    wordSpacing: '0.05em',
    maxWidth: '840px',
    paragraphSpacing: '1.8em',
    fontSize: 22,
    focusLine: false,
    focusLineOpacity: 0.22,
    sentenceChunking: false,
    maxChunkWords: 8,
    sentenceReveal: false,
  },
  B: {
    id: 'B',
    label: 'Moderate Focus Profile',
    profileName: 'Moderate Focus Profile',
    description:
      'Your profile shows meaningful attention variability during reading. You likely re-read sentences often and lose your place in long paragraphs. Preset B gives your brain the anchors it needs to stay on track.',
    bionicIntensity: 0.50,
    lineHeight: 1.90,
    letterSpacing: '0.033em',
    wordSpacing: '0.08em',
    maxWidth: '780px',
    paragraphSpacing: '2.2em',
    fontSize: 24,
    focusLine: true,
    focusLineOpacity: 0.24,
    sentenceChunking: true,
    maxChunkWords: 7,
    sentenceReveal: true,
  },
  C: {
    id: 'C',
    label: 'High-Demand Focus Profile',
    profileName: 'High-Demand Focus Profile',
    description:
      'Your profile shows high attention demand during reading tasks. You likely find sustained reading genuinely exhausting. Preset C applies the full Readapt toolkit — every setting is calibrated to minimize effort and maximize engagement.',
    bionicIntensity: 0.50,
    lineHeight: 2.16,
    letterSpacing: '0.039em',
    wordSpacing: '0.12em',
    maxWidth: '730px',
    paragraphSpacing: '2.8em',
    fontSize: 26,
    focusLine: false,
    focusLineOpacity: 0.24,
    sentenceChunking: true,
    maxChunkWords: 5,
    sentenceReveal: true,
  },
};

// ─── Score → Preset mapping (DPR §7.2) ───────────────────────────
export function scoreToPreset(score: number): PresetId {
  if (score <= 8) return 'A';
  if (score <= 15) return 'B';
  return 'C';
}

// ─── Bionic Reading ───────────────────────────────────────────────
/**
 * Bolds the first N% of a word by character count.
 * Edge cases per DPR §8.1:
 *   1–2 chars → entire word bolded
 *   3–4 chars → fixed 2 chars bolded
 *   punctuation/numbers → untouched
 */
export function applyBionic(word: string, intensity: number = 0.45): string {
  if (!word.match(/[a-zA-Z]/)) return word; // numbers, punctuation untouched

  const letters = word.replace(/[^a-zA-Z]/g, '');
  if (letters.length <= 2) return `<b>${word}</b>`;
  if (letters.length <= 4) {
    const boldLength = 2;
    return `<b>${word.slice(0, boldLength)}</b>${word.slice(boldLength)}`;
  }

  const boldLength = Math.max(1, Math.round(word.length * intensity));
  const boldPart = word.slice(0, boldLength);
  const restPart = word.slice(boldLength);
  return `<b>${boldPart}</b>${restPart}`;
}

export function applyBionicToText(text: string, intensity: number): string {
  // Split on word boundaries, preserve punctuation and spaces
  return text.replace(/\b([a-zA-Z]+)\b/g, (match) => applyBionic(match, intensity));
}

// ─── Sentence Chunking ────────────────────────────────────────────
const SPLIT_POINTS = [' and ', ' but ', ' or ', ' because ',
                      ' which ', ' that ', ', ', ' — ', '; ', ': '];

export function chunkSentence(sentence: string, maxChunkWords: number = 5): string {
  const words = sentence.trim().split(/\s+/);
  if (words.length <= maxChunkWords) return sentence;

  const chunks: string[] = [];
  let remaining = sentence.trim();
  let splits = 0;

  while (remaining.split(/\s+/).length > maxChunkWords && splits < 2) {
    const lower = remaining.toLowerCase();
    const midpoint = Math.floor(lower.length / 2);

    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    let splitLength = 0;

    for (const point of SPLIT_POINTS) {
      let cursor = lower.indexOf(point);
      while (cursor !== -1) {
        const before = remaining.slice(0, cursor + point.length).trim();
        const after = remaining.slice(cursor + point.length).trim();
        if (before.split(/\s+/).length >= 3 && after.split(/\s+/).length >= 3) {
          const distance = Math.abs(cursor - midpoint);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = cursor;
            splitLength = point.length;
          }
        }
        cursor = lower.indexOf(point, cursor + 1);
      }
    }

    if (bestIndex === -1) {
      const wordsInRemaining = remaining.split(/\s+/);
      const midWords = Math.floor(wordsInRemaining.length / 2);
      chunks.push(wordsInRemaining.slice(0, midWords).join(' '));
      remaining = wordsInRemaining.slice(midWords).join(' ').trim();
    } else {
      chunks.push(remaining.slice(0, bestIndex + splitLength).trim());
      remaining = remaining.slice(bestIndex + splitLength).trim();
    }

    splits += 1;
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.join('\n');
}

// ─── Full Paragraph Processor ─────────────────────────────────────
export interface AdaptedParagraph {
  html: string;       // HTML with bionic <b> tags
  chunks: string[];   // sentence chunks for reveal mode
}

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
}

export function adaptParagraph(
  paragraph: string,
  preset: PresetConfig,
  options: { bionic: boolean; chunking: boolean }
): AdaptedParagraph {
  let sentences = splitIntoSentences(paragraph);

  // Apply chunking (Pro feature simulation — always on for presets B/C)
  if (options.chunking && preset.sentenceChunking) {
    sentences = sentences.map(s =>
      chunkSentence(s.trim(), preset.maxChunkWords)
    );
  }

  // Apply bionic reading
  const html = sentences
    .map(s => {
      if (options.bionic) {
        return applyBionicToText(s, preset.bionicIntensity);
      }
      return s;
    })
    .join(' ');

  return {
    html,
    chunks: sentences,
  };
}

export function adaptText(
  text: string,
  preset: PresetConfig,
  options: { bionic: boolean; chunking: boolean }
): AdaptedParagraph[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.map(p => adaptParagraph(p, preset, options));
}

// ─── Sample Texts (for Landing Page Demo) ────────────────────────
export const SAMPLE_TEXTS = {
  article: `The human brain processes written language in a remarkably efficient way. When you read, your eyes don't move smoothly across a line of text — instead they make rapid, jerky movements called saccades, jumping from one anchor point to the next. Your brain fills in the gaps, predicting and pattern-matching words faster than your eyes can physically scan them. This predictive processing is why speed reading is possible, and it's also why ADHD makes traditional reading so difficult: the prediction engine gets interrupted before it can lock on.`,

  academic: `Attention Deficit Hyperactivity Disorder (ADHD) is characterized by persistent patterns of inattention, hyperactivity, and impulsivity that interfere substantially with daily functioning. Neuroimaging studies have consistently demonstrated reduced activation in prefrontal cortical regions during sustained attention tasks, which directly mediates the reading difficulties experienced by individuals with ADHD. The dopaminergic reward system's role in maintaining attentional engagement suggests that environmental modifications to the reading stimulus itself may compensate for endogenous regulatory deficits.`,

  news: `Scientists have identified a new approach to improving reading comprehension in people with attention difficulties. The technique, which involves strategically bolding portions of words, appears to help the brain's pattern-recognition systems work more efficiently. Early studies suggest that readers who use this method show significantly faster reading speeds without any loss in comprehension. The approach is particularly promising for people who struggle with traditional text formats, including those diagnosed with ADHD, dyslexia, or other reading challenges. Researchers believe the effect works by reducing the cognitive effort required for word recognition, freeing up mental resources for understanding and retention.`,
};

// ─── Counting helpers ─────────────────────────────────────────────
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
