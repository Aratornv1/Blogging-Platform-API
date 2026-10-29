import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'mysql2/promise';
import { createPost, deletePost, getPost, listPosts, updatePost } from './posts';
import { parseId, parsePostInput } from './validation';

const notFound = (res: Response, what: string) => res.status(404).json({ error: `${what} not found` });

export function createApp(pool: Pool) {
  const app = express();
  app.use(express.json());

  // Express 5 передає помилки з async-обробників в error handler сам
  app.post('/posts', async (req, res) => {
    const parsed = parsePostInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
    res.status(201).json(await createPost(pool, parsed.data));
  });

  app.get('/posts', async (req, res) => {
    const { term } = req.query;
    if (term !== undefined && typeof term !== 'string') {
      return res.status(400).json({ error: 'Validation failed', details: [{ field: 'term', message: 'term must be a single string' }] });
    }
    res.json(await listPosts(pool, term));
  });

  app.get('/posts/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return invalidId(res);
    const post = await getPost(pool, id);
    if (!post) return notFound(res, 'Post');
    res.json(post);
  });

  app.put('/posts/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return invalidId(res);
    const parsed = parsePostInput(req.body);
    if (!parsed.ok) return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
    const post = await updatePost(pool, id, parsed.data);
    if (!post) return notFound(res, 'Post');
    res.json(post);
  });

  app.delete('/posts/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return invalidId(res);
    if (!(await deletePost(pool, id))) return notFound(res, 'Post');
    res.status(204).end();
  });

  app.use((_req, res) => notFound(res, 'Route'));

  app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Validation failed', details: [{ field: 'body', message: 'Malformed JSON' }] });
    }
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function invalidId(res: Response) {
  return res.status(400).json({
    error: 'Validation failed',
    details: [{ field: 'id', message: 'id must be a positive integer' }],
  });
}
