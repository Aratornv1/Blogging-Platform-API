import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { createPool, initDatabase } from '../src/db';

// Потрібен запущений MySQL; тести працюють з окремою базою (DB_NAME_TEST)
const pool = createPool(config.db.testName);
const api = request(createApp(pool));

const post = { title: 'Intro to Node', content: 'Express and MySQL', category: 'Tech', tags: ['Node', 'sql'] };

beforeAll(() => initDatabase(config.db.testName));
beforeEach(async () => {
  await pool.query('DELETE FROM posts');
  await pool.query('DELETE FROM tags');
});
afterAll(() => pool.end());

describe('POST /posts', () => {
  it('creates a post and returns 201 with id and timestamps', async () => {
    const res = await api.post('/posts').send(post);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Intro to Node', category: 'Tech', tags: ['node', 'sql'] });
    expect(res.body.id).toBeTypeOf('number');
    expect(new Date(res.body.createdAt).toISOString()).toBe(res.body.createdAt);
    expect(res.body.updatedAt).toBe(res.body.createdAt);
  });

  it('returns 400 with field errors for invalid input', async () => {
    const res = await api.post('/posts').send({ title: '', tags: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['title', 'content', 'category', 'tags']),
    );
  });

  it('returns 400 for malformed JSON and for a missing body', async () => {
    const bad = await api.post('/posts').set('Content-Type', 'application/json').send('{"title":');
    expect(bad.status).toBe(400);
    expect(bad.body.details[0].message).toBe('Malformed JSON');
    expect((await api.post('/posts')).status).toBe(400);
  });

  it('reuses existing tags between posts', async () => {
    await api.post('/posts').send(post);
    await api.post('/posts').send({ ...post, title: 'Second' });
    const [[row]] = await pool.query<any[]>('SELECT COUNT(*) AS n FROM tags');
    expect(row.n).toBe(2);
  });
});

describe('GET /posts', () => {
  it('returns all posts', async () => {
    await api.post('/posts').send(post);
    await api.post('/posts').send({ ...post, title: 'Second', tags: [] });
    const res = await api.get('/posts');
    expect(res.status).toBe(200);
    expect(res.body.map((p: { title: string }) => p.title)).toEqual(['Intro to Node', 'Second']);
    expect(res.body[1].tags).toEqual([]);
  });

  it('searches title, content and category by partial term', async () => {
    await api.post('/posts').send({ title: 'Cooking pasta', content: 'boil water', category: 'Food', tags: [] });
    await api.post('/posts').send({ title: 'Other', content: 'deep tech dive', category: 'Misc', tags: [] });
    await api.post('/posts').send({ title: 'Third', content: 'nothing', category: 'Technology', tags: [] });
    const titles = async (term: string) =>
      (await api.get('/posts').query({ term })).body.map((p: { title: string }) => p.title);
    expect(await titles('pasta')).toEqual(['Cooking pasta']);
    expect(await titles('tech')).toEqual(['Other', 'Third']);
    expect(await titles('FOOD')).toEqual(['Cooking pasta']);
    expect(await titles('zzz')).toEqual([]);
  });

  it('treats % and _ in the term literally', async () => {
    await api.post('/posts').send({ ...post, title: 'Save 100% now' });
    await api.post('/posts').send({ ...post, title: 'Plain title' });
    const res = await api.get('/posts').query({ term: '100%' });
    expect(res.body.map((p: { title: string }) => p.title)).toEqual(['Save 100% now']);
    expect((await api.get('/posts').query({ term: '%' })).body).toHaveLength(1);
  });

  it('rejects a repeated term parameter', async () => {
    expect((await api.get('/posts?term=a&term=b')).status).toBe(400);
  });
});

describe('GET /posts/:id', () => {
  it('returns the post', async () => {
    const { body: created } = await api.post('/posts').send(post);
    const res = await api.get(`/posts/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it('returns 404 for a missing post and 400 for a bad id', async () => {
    expect((await api.get('/posts/999999')).status).toBe(404);
    expect((await api.get('/posts/abc')).status).toBe(400);
  });
});

describe('PUT /posts/:id', () => {
  it('updates fields and tags, keeps createdAt, changes updatedAt', async () => {
    const { body: created } = await api.post('/posts').send(post);
    await new Promise((r) => setTimeout(r, 20));
    const res = await api.put(`/posts/${created.id}`).send({ ...post, title: 'New', tags: ['rest'] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.id, title: 'New', tags: ['rest'], createdAt: created.createdAt });
    expect(res.body.updatedAt).not.toBe(created.updatedAt);
  });

  it('changes updatedAt even when nothing else changed', async () => {
    const { body: created } = await api.post('/posts').send(post);
    await new Promise((r) => setTimeout(r, 20));
    const res = await api.put(`/posts/${created.id}`).send(post);
    expect(res.body.updatedAt).not.toBe(created.updatedAt);
  });

  it('returns 400 for invalid input and 404 for a missing post', async () => {
    const { body: created } = await api.post('/posts').send(post);
    expect((await api.put(`/posts/${created.id}`).send({ title: 'x' })).status).toBe(400);
    expect((await api.put('/posts/999999').send(post)).status).toBe(404);
  });
});

describe('DELETE /posts/:id', () => {
  it('deletes the post with 204, then returns 404', async () => {
    const { body: created } = await api.post('/posts').send(post);
    const res = await api.delete(`/posts/${created.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await api.get(`/posts/${created.id}`)).status).toBe(404);
    expect((await api.delete(`/posts/${created.id}`)).status).toBe(404);
    const [links] = await pool.query<any[]>('SELECT * FROM post_tags');
    expect(links).toHaveLength(0);
  });
});

describe('unknown routes', () => {
  it('return 404 JSON', async () => {
    const res = await api.get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });
});
