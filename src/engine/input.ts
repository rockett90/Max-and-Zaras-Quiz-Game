/**
 * Keyboard state: which keys are held, plus presses buffered until the next game
 * step consumes them (so a tap shorter than one frame is never lost).
 */
export class Keyboard {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor(
    target: Window,
    private readonly captured: ReadonlySet<string>,
  ) {
    target.addEventListener('keydown', (e) => {
      if (isTypingTarget(e.target) || !this.captured.has(e.code)) return;
      e.preventDefault(); // stop Space/arrows scrolling the page
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
    target.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
    });
    target.addEventListener('blur', () => this.clear());
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  /** True once per physical press. */
  consume(code: string): boolean {
    return this.pressed.delete(code);
  }

  clear(): void {
    this.held.clear();
    this.pressed.clear();
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
