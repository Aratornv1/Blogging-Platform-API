import { afterEach, describe, expect, it } from 'vitest';
import { closePool, createPool, getPool } from '../src/db';

// Пул підключається ліниво, тож ці тести не потребують запущеного MySQL.
describe('db pool', () => {
  afterEach(async () => {
    await closePool();
  });

  it('getPool (Singleton) повертає один і той самий пул', () => {
    expect(getPool()).toBe(getPool());
  });

  it('після closePool getPool створює новий пул', async () => {
    const first = getPool();
    await closePool();
    expect(getPool()).not.toBe(first);
  });

  it('createPool (Factory) щоразу створює новий пул', async () => {
    const a = createPool('blog_api_test');
    const b = createPool('blog_api_test');
    expect(a).not.toBe(b);
    await Promise.all([a.end(), b.end()]);
  });
});
