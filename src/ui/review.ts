/**
 * The end-of-round review on the results screen: every question missed at the
 * first try, with its answer and explanation. Ones put right on the second go
 * say so, so the review reads as progress rather than a list of failures.
 */
import { answerText } from '../game/questions';
import type { Missed } from '../game/reask';

export function renderReview(container: HTMLElement, missed: readonly Missed[]): void {
  container.replaceChildren();
  container.hidden = missed.length === 0;
  if (missed.length === 0) return;

  const heading = document.createElement('h2');
  heading.textContent = "Let's look again";
  const list = document.createElement('ul');
  list.className = 'review__list';
  for (const { question, recovered } of missed) {
    const item = document.createElement('li');
    item.className = 'review__item';
    item.toggleAttribute('data-recovered', recovered);
    const prompt = document.createElement('p');
    prompt.className = 'review__prompt';
    prompt.textContent = question.prompt;
    const answer = document.createElement('p');
    answer.className = 'review__answer';
    answer.textContent = `${recovered ? '✓ Got it on the second go: ' : 'Answer: '}${answerText(question)}`;
    item.append(prompt, answer);
    if (!recovered) {
      const explain = document.createElement('p');
      explain.className = 'review__explain';
      explain.textContent = question.explain;
      item.append(explain);
    }
    list.append(item);
  }
  container.append(heading, list);
}
