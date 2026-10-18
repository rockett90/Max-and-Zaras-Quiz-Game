import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any sub-path, e.g. games.teamrockett.co.uk/Quiz_Game
  base: './',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
