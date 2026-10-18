/**
 * Read-aloud through the browser's speech synthesis. Feature-detected: `canSpeak`
 * is false when the browser has no synthesis or no voice for a language, and the
 * caller hides its button. Voices often load after the page (Chrome), so callers
 * subscribe with `onVoicesChanged` and ask again.
 */

/** A little slower than default, for young listeners. */
const RATE = 0.9;

/** Preferred regional voice per language, where the curriculum has one (UK English). */
const PREFERRED_REGION: Record<string, string> = { en: 'en-gb' };

export interface VoiceLike {
  lang: string;
  name: string;
  localService?: boolean;
}

/**
 * The best voice for a language code ("en", "ro"): the preferred region first,
 * then any voice in that language, preferring ones on the device (they work
 * offline and start sooner).
 */
export function chooseVoice<V extends VoiceLike>(voices: readonly V[], lang: string): V | undefined {
  const code = lang.toLowerCase();
  const matching = voices.filter((v) => {
    const l = v.lang.toLowerCase().replace('_', '-');
    return l === code || l.startsWith(`${code}-`);
  });
  const region = PREFERRED_REGION[code];
  const score = (v: V): number => (region && v.lang.toLowerCase().replace('_', '-') === region ? 2 : 0) + (v.localService ? 1 : 0);
  return [...matching].sort((a, b) => score(b) - score(a))[0];
}

export class Speech {
  private readonly synth: SpeechSynthesis | undefined;
  private listeners: (() => void)[] = [];
  private current: SpeechSynthesisUtterance | undefined;

  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined;
    this.synth?.addEventListener('voiceschanged', () => {
      for (const listener of this.listeners) listener();
    });
  }

  canSpeak(lang: string): boolean {
    return this.synth !== undefined && chooseVoice(this.synth.getVoices(), lang) !== undefined;
  }

  onVoicesChanged(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** True from `speak` until the utterance ends, fails or is cancelled. */
  get speaking(): boolean {
    return this.current !== undefined;
  }

  /**
   * iOS only lets speech start from a tap; speaking an empty utterance inside one
   * unlocks it for the rest of the page's life. Call from a click handler.
   */
  unlock(): void {
    if (!this.synth) return;
    const silent = new SpeechSynthesisUtterance('');
    silent.volume = 0;
    this.synth.speak(silent);
  }

  speak(text: string, lang: string, onEnd?: () => void): void {
    if (!this.synth) return;
    this.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = chooseVoice(this.synth.getVoices(), lang);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? lang;
    utterance.rate = RATE;
    const done = (): void => {
      if (this.current !== utterance) return;
      this.current = undefined;
      onEnd?.();
    };
    utterance.addEventListener('end', done);
    utterance.addEventListener('error', done);
    this.current = utterance;
    this.synth.speak(utterance);
  }

  cancel(): void {
    this.current = undefined;
    this.synth?.cancel();
  }
}
