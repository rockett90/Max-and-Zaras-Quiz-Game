import { defineConfig } from 'vitest/config';
import { questionsPlugin } from './build/questionsPlugin';

export default defineConfig({
  // Relative base so the build works from any sub-path, e.g. games.teamrockett.co.uk/Quiz_Game
  base: './',
  plugins: [questionsPlugin()],
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
