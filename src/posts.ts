import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { PostInput } from './validation';

export interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

type Db = Pool | PoolConnection;

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  content: string;
  category: string;
  created_at: Date;
  updated_at: Date;
}

interface PostTagRow extends RowDataPacket {
  post_id: number;
  name: string;
}

const POST_COLUMNS = 'id, title, content, category, created_at, updated_at';

async function withTransaction<T>(pool: Pool, fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Один додатковий запит на всі пости замість запиту на кожен пост
async function attachTags(db: Db, rows: PostRow[]): Promise<Post[]> {
  if (rows.length === 0) return [];
  const [tagRows] = await db.query<PostTagRow[]>(
    `SELECT pt.post_id, t.name
       FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
      WHERE pt.post_id IN (?)
      ORDER BY t.name`,
    [rows.map((r) => r.id)],
  );
  const tagsByPost = new Map<number, string[]>();
  for (const { post_id, name } of tagRows) {
    tagsByPost.set(post_id, [...(tagsByPost.get(post_id) ?? []), name]);
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    category: r.category,
    tags: tagsByPost.get(r.id) ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

// Замінює теги поста: стара прив'язка видаляється, нові теги створюються за потреби
async function replaceTags(conn: PoolConnection, postId: number, tags: string[]): Promise<void> {
  await conn.query('DELETE FROM post_tags WHERE post_id = ?', [postId]);
  if (tags.length === 0) return;
  await conn.query('INSERT IGNORE INTO tags (name) VALUES ?', [tags.map((t) => [t])]);
  const [tagRows] = await conn.query<(RowDataPacket & { id: number })[]>(
    'SELECT id FROM tags WHERE name IN (?)',
    [tags],
  );
  await conn.query('INSERT INTO post_tags (post_id, tag_id) VALUES ?', [tagRows.map((t) => [postId, t.id])]);
}

// Екранує % і _ , щоб користувач шукав їх як звичайні символи
const escapeLike = (term: string) => term.replace(/[\\%_]/g, '\\$&');

export async function listPosts(pool: Pool, term?: string): Promise<Post[]> {
  let sql = `SELECT ${POST_COLUMNS} FROM posts`;
  const params: string[] = [];
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    sql += ' WHERE title LIKE ? OR content LIKE ? OR category LIKE ?';
    params.push(pattern, pattern, pattern);
  }
  const [rows] = await pool.query<PostRow[]>(`${sql} ORDER BY id`, params);
  return attachTags(pool, rows);
}

export async function getPost(db: Db, id: number): Promise<Post | null> {
  const [rows] = await db.query<PostRow[]>(`SELECT ${POST_COLUMNS} FROM posts WHERE id = ?`, [id]);
  const [post] = await attachTags(db, rows);
  return post ?? null;
}

export async function createPost(pool: Pool, input: PostInput): Promise<Post> {
  return withTransaction(pool, async (conn) => {
    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO posts (title, content, category) VALUES (?, ?, ?)',
      [input.title, input.content, input.category],
    );
    await replaceTags(conn, result.insertId, input.tags);
    return (await getPost(conn, result.insertId))!;
  });
}

export async function updatePost(pool: Pool, id: number, input: PostInput): Promise<Post | null> {
  return withTransaction(pool, async (conn) => {
    // updated_at ставимо явно: MySQL не змінює його, якщо значення полів не змінилися
    const [result] = await conn.query<ResultSetHeader>(
      'UPDATE posts SET title = ?, content = ?, category = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?',
      [input.title, input.content, input.category, id],
    );
    if (result.affectedRows === 0) return null;
    await replaceTags(conn, id, input.tags);
    return getPost(conn, id);
  });
}

export async function deletePost(pool: Pool, id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM posts WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
