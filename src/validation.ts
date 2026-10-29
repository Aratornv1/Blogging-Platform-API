import { z } from 'zod';

export interface FieldError {
  field: string;
  message: string;
}

const requiredString = (name: string, max: number) =>
  z
    .string(`${name} is required and must be a string`)
    .trim()
    .min(1, `${name} must not be empty`)
    .max(max, `${name} must be at most ${max} characters`);

const postSchema = z.object({
  title: requiredString('title', 255),
  content: requiredString('content', 100_000),
  category: requiredString('category', 100),
  tags: z
    .array(requiredString('tag', 50), 'tags is required and must be an array of strings')
    .max(20, 'tags must contain at most 20 items')
    // теги нормалізуємо: нижній регістр без дублікатів (унікальність у БД не залежить від регістру)
    .transform((tags) => [...new Set(tags.map((t) => t.toLowerCase()))]),
});

export type PostInput = z.infer<typeof postSchema>;

export type ParseResult<T> = { ok: true; data: T } | { ok: false; errors: FieldError[] };

export function parsePostInput(body: unknown): ParseResult<PostInput> {
  const result = postSchema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  };
}

// Додатне ціле до 10 цифр (INT UNSIGNED), інакше null
export function parseId(value: string): number | null {
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null;
}
