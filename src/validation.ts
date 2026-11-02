import { z } from 'zod';

export interface FieldError {
  field: string;
  message: string;
}// preparation  for check data from user input

const requiredString = (name: string, max: number) =>
  z
    .string(`${name} is required and must be a string`) // only line 
    .trim() //cut whitespace from both ends of the string
    .min(1, `${name} must not be empty`) // not empty
    .max(max, `${name} must be at most ${max} characters`);
// use library zod to validate user input data
const postSchema = z.object({
  title: requiredString('title', 255),
  content: requiredString('content', 100_000),
  category: requiredString('category', 100),
  tags: z
    .array(requiredString('tag', 50), 'tags is required and must be an array of strings')
    .max(20, 'tags must contain at most 20 items')
    
    .transform((tags) => [...new Set(tags.map((t) => t.normalize('NFC').toLowerCase()))]),
}); // describe what a post looks like

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
} // check body of request to see if it matches the postSchema, if not return errors


export function parseId(value: string): number | null { // take url param and check if it is a valid id, if not return null
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null; // check if value is a positive integer with up to 10 digits
} // transform id  from url to number or return null
