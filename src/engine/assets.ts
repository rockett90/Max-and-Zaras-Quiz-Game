/**
 * Asset preloading. Everything is fetched and decoded once, before play starts, so
 * nothing is created or loaded inside the render loop.
 */

export type ImageSet<K extends string> = Record<K, HTMLImageElement>;

export async function loadImages<K extends string>(urls: Record<K, string>): Promise<ImageSet<K>> {
  const entries = await Promise.all(
    (Object.entries(urls) as [K, string][]).map(async ([key, url]) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      return [key, img] as const;
    }),
  );
  return Object.fromEntries(entries) as ImageSet<K>;
}

/** A short sound effect that can overlap itself (rapid fire). */
export class Sound {
  private readonly source: HTMLAudioElement;

  constructor(url: string, private readonly volume = 1) {
    this.source = new Audio(url);
    this.source.preload = 'auto';
  }

  play(): void {
    const voice = this.source.cloneNode() as HTMLAudioElement;
    voice.volume = this.volume;
    // Browsers reject play() before the first user gesture; a missed effect is harmless.
    voice.play().catch(() => undefined);
  }
}

/** Looping background music. */
export class Music {
  private readonly el: HTMLAudioElement;

  constructor(url: string, volume = 0.5) {
    this.el = new Audio(url);
    this.el.loop = true;
    this.el.volume = volume;
    this.el.preload = 'auto';
  }

  start(): void {
    this.el.currentTime = 0;
    this.el.play().catch(() => undefined);
  }

  pause(): void {
    this.el.pause();
  }

  resume(): void {
    this.el.play().catch(() => undefined);
  }

  stop(): void {
    this.el.pause();
    this.el.currentTime = 0;
  }
}
