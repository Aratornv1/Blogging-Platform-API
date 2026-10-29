import { defineConfig } from 'vitest/config';

export default defineConfig({
  // усі тести ділять одну тестову базу, тому файли йдуть по черзі
  test: { fileParallelism: false },
});
