/// <reference types="node" />
/**
 * Vite plugin: content/questions/**.yaml → validated JSON as `virtual:questions`.
 *
 * Validation runs at build start, so `vite build` (and therefore `pnpm verify`) fails
 * on any bad question even before the game imports the module. Production builds
 * drop draft questions (REQ-CONT-001); the dev server keeps them so they can be
 * play-tested before review.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import type { Plugin } from 'vite';
import { formatIssues, validateBank, type Question, type SourceFile } from '../src/game/questionSchema';

export const CONTENT_DIR = 'content/questions';

const VIRTUAL_ID = 'virtual:questions';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/** Every .yaml/.yml file under `dir`, sorted so ids collide in a stable order. */
export function loadSourceFiles(dir: string): SourceFile[] {
  const files = readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.ya?ml$/.test(f))
    .sort();
  return files.map((f) => {
    const path = join(dir, f);
    return { file: relative(process.cwd(), path).replaceAll('\\', '/'), data: parse(readFileSync(path, 'utf8')) as unknown };
  });
}

export function buildQuestions(dir: string, production: boolean): Question[] {
  const { questions, issues } = validateBank(loadSourceFiles(dir));
  if (issues.length > 0) {
    throw new Error(`${issues.length} question problem(s):\n${formatIssues(issues)}`);
  }
  return production ? questions.filter((q) => q.status === 'reviewed') : questions;
}

export function questionsPlugin(): Plugin {
  let production = false;
  let root = process.cwd();
  let questions: Question[] = [];

  return {
    name: 'quiz-questions',
    configResolved(config) {
      production = config.command === 'build';
      root = config.root;
    },
    buildStart() {
      const dir = join(root, CONTENT_DIR);
      for (const file of loadSourceFiles(dir)) this.addWatchFile(join(root, file.file));
      questions = buildQuestions(dir, production);
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      return id === RESOLVED_ID ? `export default ${JSON.stringify(questions)};` : undefined;
    },
    handleHotUpdate({ file, server }) {
      if (!/\.ya?ml$/.test(file) || !file.replaceAll('\\', '/').includes(CONTENT_DIR)) return;
      questions = buildQuestions(join(root, CONTENT_DIR), production);
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
    },
  };
}
