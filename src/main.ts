import './styles.css';
import { loadImages, Music, Sound, type ImageSet } from './engine/assets';
import { Keyboard } from './engine/input';
import { startLoop } from './engine/loop';
import { randomSeed, Rng } from './engine/rng';
import { fitStage } from './engine/viewport';
import { POINTS_PER_LEVEL, WORLD_HEIGHT, WORLD_WIDTH, type Level } from './game/config';
import { answerText, cardText, isCorrect, pickQuestion, type Question } from './game/questions';
import { renderWorld, type ImageKey } from './game/render';
import { RoundScore } from './game/scoring';
import { World } from './game/world';

import backgroundUrl from './assets/background.png';
import boxUrl from './assets/box1.png';
import bubbleUrl from './assets/bubble.png';
import crabUrl from './assets/crab.png';
import rockUrl from './assets/rock.png';
import seaweedUrl from './assets/seaweed.png';
import musicUrl from './assets/background_music.mp3';
import bubbleSfxUrl from './assets/bubble.mp3';
import jumpSfxUrl from './assets/jump.mp3';

const AGES = [4, 5, 6, 7, 8, 9, 10, 11] as const;
const FEEDBACK_SECONDS = 1.4;

type ScreenId = 'loading' | 'splash' | 'setup' | 'question' | 'results';

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

function show(...ids: ScreenId[]): void {
  for (const screen of document.querySelectorAll<HTMLElement>('.screen')) {
    screen.toggleAttribute('data-active', ids.some((id) => screen.id === `screen-${id}`));
  }
}

async function main(): Promise<void> {
  const stage = el<HTMLDivElement>('stage');
  const canvas = el<HTMLCanvasElement>('game');
  fitStage(el('viewport'), stage, canvas, WORLD_WIDTH, WORLD_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');

  const images: ImageSet<ImageKey> = await loadImages({
    background: backgroundUrl,
    crab: crabUrl,
    rock: rockUrl,
    seaweed: seaweedUrl,
    box: boxUrl,
    bubble: bubbleUrl,
  });
  const music = new Music(musicUrl, 0.4);
  const sfx = { jump: new Sound(jumpSfxUrl, 0.7), bubble: new Sound(bubbleSfxUrl, 0.7) };
  const keys = new Keyboard(window, new Set(['ArrowRight', 'ArrowUp', 'Space']));

  let age: number | undefined;
  let rng = new Rng(randomSeed());
  let world = new World(rng);
  let round = new RoundScore();
  let playing = false;

  // --- Setup screen -------------------------------------------------------
  const ageButtons = el('age-buttons');
  const startButton = el<HTMLButtonElement>('setup-start');
  for (const a of AGES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'radio';
    button.textContent = String(a);
    button.setAttribute('aria-checked', 'false');
    button.addEventListener('click', () => {
      age = a;
      for (const b of ageButtons.children) b.setAttribute('aria-checked', String(b === button));
      startButton.disabled = false;
    });
    ageButtons.append(button);
  }

  // --- Question card ------------------------------------------------------
  const form = el<HTMLFormElement>('question-form');
  const levelText = el('question-level');
  const questionText = el('question-text');
  const answerInput = el<HTMLInputElement>('question-answer');
  const feedback = el('question-feedback');
  let current: { question: Question; level: Level } | undefined;

  const askQuestion = (level: Level): void => {
    const question = age === undefined ? undefined : pickQuestion(age, level, rng);
    if (!question) return; // nothing for this age/level yet; keep playing
    current = { question, level };
    playing = false;
    keys.clear();
    const boost = round.nextMultiplier > 1 ? `  — streak ×${round.nextMultiplier}!` : '';
    levelText.textContent = `${'★'.repeat(level)}  ${level * POINTS_PER_LEVEL} points${boost}`;
    questionText.textContent = cardText(question, rng);
    answerInput.value = '';
    answerInput.disabled = false;
    feedback.textContent = '';
    delete feedback.dataset['result'];
    show('question');
    answerInput.focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!current || answerInput.disabled || answerInput.value.trim() === '') return;
    const { question, level } = current;
    answerInput.disabled = true;
    const right = isCorrect(question, answerInput.value);
    const result = round.answer(level, right);
    if (right) {
      const inARow = result.streak >= 3 ? ` — ${result.streak} in a row!` : '';
      feedback.textContent = `Correct! +${result.points}${inARow}`;
      feedback.dataset['result'] = 'good';
    } else {
      feedback.textContent = `The answer was: ${answerText(question)}. ${question.explain}`;
      feedback.dataset['result'] = 'bad';
    }
    current = undefined;
    window.setTimeout(() => {
      show();
      playing = true;
    }, FEEDBACK_SECONDS * 1000);
  });

  // --- Round lifecycle ----------------------------------------------------
  const startRound = (): void => {
    rng = new Rng(randomSeed());
    world = new World(rng);
    round = new RoundScore();
    keys.clear();
    show();
    music.start();
    playing = true;
  };

  const endRound = (): void => {
    playing = false;
    music.stop();
    const stars = el('results-stars');
    stars.textContent = '';
    for (let i = 1; i <= 3; i++) {
      const star = document.createElement('span');
      star.className = 'results-star';
      star.textContent = '★';
      star.toggleAttribute('data-earned', i <= round.stars);
      star.style.setProperty('--delay', `${i * 0.35}s`);
      stars.append(star);
    }
    stars.setAttribute('aria-label', `${round.stars} out of 3 stars`);
    el('results-score').textContent = `You scored ${round.score} points`;
    el('results-tally').textContent =
      round.answered === 0
        ? 'Pop a box with a bubble to get a question!'
        : `${round.correct} of ${round.answered} right` +
          (round.bestStreak >= 3 ? ` · best streak ${round.bestStreak}` : '');
    show('results');
  };

  el('splash-continue').addEventListener('click', () => show('setup'));
  startButton.addEventListener('click', startRound);
  el('results-again').addEventListener('click', () => show('setup'));

  document.addEventListener('visibilitychange', () => {
    if (!playing) return;
    if (document.hidden) music.pause();
    else music.resume();
  });

  startLoop(
    (dt) => {
      if (!playing || document.hidden) return;
      const events = world.update(dt, {
        moveRight: keys.isDown('ArrowRight'),
        jump: keys.consume('Space'),
        fire: keys.consume('ArrowUp'),
      });
      for (const event of events) {
        if (event.type === 'jumped') sfx.jump.play();
        else if (event.type === 'fired') sfx.bubble.play();
        else if (event.type === 'boxHit') askQuestion(event.level);
        else endRound();
      }
    },
    () => renderWorld(ctx, world, round, images),
  );

  show('splash');
}

main().catch((err: unknown) => {
  console.error(err);
  document.body.textContent = 'Sorry, the game failed to load. Please refresh the page.';
});
