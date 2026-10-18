import { describe, expect, it } from 'vitest';
import { chooseVoice } from '../src/engine/speech';

const voice = (lang: string, name: string, localService = false) => ({ lang, name, localService });

describe('chooseVoice', () => {
  it('finds a voice by language whatever its region or separator', () => {
    const voices = [voice('fr-FR', 'Amélie'), voice('ro_RO', 'Ioana')];
    expect(chooseVoice(voices, 'ro')?.name).toBe('Ioana');
    expect(chooseVoice(voices, 'fr')?.name).toBe('Amélie');
  });

  it('prefers UK English, then a voice on the device', () => {
    const voices = [voice('en-US', 'Samantha', true), voice('en-GB', 'Daniel'), voice('en-AU', 'Karen', true)];
    expect(chooseVoice(voices, 'en')?.name).toBe('Daniel');
    expect(chooseVoice([voice('es-MX', 'Paulina'), voice('es-ES', 'Mónica', true)], 'es')?.name).toBe('Mónica');
  });

  it('returns nothing when no voice speaks the language', () => {
    expect(chooseVoice([voice('en-GB', 'Daniel')], 'ro')).toBeUndefined();
    expect(chooseVoice([voice('enx-XX', 'Odd')], 'en')).toBeUndefined();
  });
});
