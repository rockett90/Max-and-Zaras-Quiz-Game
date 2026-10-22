import './styles.css';
import { loadImages, Music, Sound, type ImageSet } from './engine/assets';
import { Keyboard } from './engine/input';
import { startLoop } from './engine/loop';
import { randomSeed, Rng } from './engine/rng';
import { Speech } from './engine/speech';
import { fitStage } from './engine/viewport';
import { POINTS_PER_LEVEL, WORLD_HEIGHT, WORLD_WIDTH, type Level } from './game/config';
import { answerText, GENERATED_SHARE, mark, pickQuestion, PLAYABLE, type Question } from './game/questions';
import { buildBoxArt } from './game/boxArt';
import { Effects } from './game/effects';
import { renderWorld, type Art, type ImageKey } from './game/render';
import { buildScenery } from './game/scenery';
import { ReaskQueue, type Missed } from './game/reask';
import { RETRY_SHARE, RoundScore, timeLimitFor } from './game/scoring';
import { World } from './game/world';
import { QuestionCard, type Submission } from './ui/card';
import { renderReview } from './ui/review';

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
  const art: Art = { images, scenery: buildScenery(images.background), boxes: buildBoxArt(images.box) };
  const music = new Music(musicUrl, 0.4);
  const sfx = { jump: new Sound(jumpSfxUrl, 0.7), bubble: new Sound(bubbleSfxUrl, 0.7) };
  const speech = new Speech();
  const keys = new Keyboard(window, new Set(['ArrowRight', 'ArrowUp', 'Space']));

  let age: number | undefined;
  let rng = new Rng(randomSeed());
  let world = new World(rng);
  let round = new RoundScore();
  let reask = new ReaskQueue();
  /** Ids asked so far this round, so fresh picks avoid repeats. */
  let asked = new Set<string>();
  // Effects get their own RNG so they never shift what the round's RNG draws next.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const newEffects = (): Effects => new Effects(new Rng(randomSeed()), reducedMotion.matches);
  let effects = newEffects();
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
  /** The open question, where its box was popped, and its miss when this is a second go. */
  let current: { question: Question; level: Level; limit: number; x: number; y: number; retry: Missed | undefined } | undefined;

  const onSubmit = ({ answer, seconds }: Submission): void => {
    if (!current) return;
    const { question, level, limit, retry } = current;
    const { right, spelling } = answer ? mark(question, answer) : { right: false, spelling: undefined };
    const result = round.answer(level, right, { timing: { seconds, limit }, retry: retry !== undefined });
    reask.answered(question, level, right, retry);
    let message: string;
    if (right) {
      effects.celebrate(current.x, current.y, result.points, result.streak);
      const inARow = result.streak >= 3 ? ` — ${result.streak} in a row!` : '';
      const fast = result.speedBonus > 0 ? ' Speedy!' : '';
      const written = spelling === undefined ? '' : ` It's spelt ${spelling}.`;
      message = `${retry ? 'Got it this time!' : 'Correct!'} +${result.points}${fast}${inARow}${written}`;
    } else {
      const lead = answer ? '' : "Time's up! ";
      message = `${lead}The answer was: ${answerText(question)}. ${question.explain}`;
    }
    card.showResult(message, right, answer);
    current = undefined;
  };
  const card = new QuestionCard(
    el<HTMLFormElement>('question-form'),
    onSubmit,
    () => {
      show();
      playing = true;
    },
    speech,
  );

  // Dev builds only: ?type=true-false (etc.) asks only that type, to test each card.
  const devType = import.meta.env.DEV ? new URLSearchParams(location.search).get('type') : null;
  const devQuestions = PLAYABLE.filter((q) => q.type === devType);

  const askQuestion = (boxLevel: Level, x: number, y: number): void => {
    if (age === undefined) return;
    // A missed question that is due comes back in place of a fresh one, at its own level.
    const retry = reask.due();
    const question =
      retry?.question ??
      (devQuestions.length > 0 ? pickQuestion(age, boxLevel, rng, devQuestions, 0, asked) : pickQuestion(age, boxLevel, rng, PLAYABLE, GENERATED_SHARE, asked));
    if (!question) return; // nothing for this age/level yet; keep playing
    asked.add(question.id);
    const level = retry?.level ?? boxLevel;
    const limit = timeLimitFor(age);
    current = { question, level, limit, x, y, retry };
    playing = false;
    keys.clear();
    const points = level * POINTS_PER_LEVEL * (retry ? RETRY_SHARE : 1);
    const boost = round.nextMultiplier > 1 ? `  — streak ×${round.nextMultiplier}!` : '';
    const header = `${retry ? 'Second go!  ' : ''}${'★'.repeat(level)}  ${points} points${boost}`;
    card.open(question, header, limit, rng);
    show('question');
    card.focus();
  };

  // --- Round lifecycle ----------------------------------------------------
  const startRound = (): void => {
    rng = new Rng(randomSeed());
    world = new World(rng);
    round = new RoundScore();
    reask = new ReaskQueue();
    asked = new Set();
    effects = newEffects();
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
    renderReview(el('results-review'), reask.missed);
    show('results');
  };

  el('splash-continue').addEventListener('click', () => show('setup'));
  startButton.addEventListener('click', () => {
    speech.unlock(); // iOS speaks only after a tap has started speech once
    startRound();
  });
  el('results-again').addEventListener('click', () => show('setup'));

  document.addEventListener('visibilitychange', () => {
    if (!playing) return;
    if (document.hidden) music.pause();
    else music.resume();
  });

  startLoop(
    (dt) => {
      if (document.hidden) return;
      card.tick(dt); // the question clock runs on game time too
      if (!playing) return;
      const events = world.update(dt, {
        moveRight: keys.isDown('ArrowRight'),
        jump: keys.consume('Space'),
        fire: keys.consume('ArrowUp'),
      });
      effects.update(dt, world);
      for (const event of events) {
        effects.handle(event);
        if (event.type === 'jumped') sfx.jump.play();
        else if (event.type === 'fired') sfx.bubble.play();
        else if (event.type === 'boxHit') askQuestion(event.level, event.x, event.y);
        else if (event.type === 'timeUp') endRound();
      }
    },
    () => renderWorld(ctx, world, round, effects, art),
  );

  show('splash');
}

main().catch((err: unknown) => {
  console.error(err);
  document.body.textContent = 'Sorry, the game failed to load. Please refresh the page.';
});
