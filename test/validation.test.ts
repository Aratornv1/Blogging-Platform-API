import { describe, expect, it } from 'vitest';
import { parseId, parsePostInput } from '../src/validation';

const valid = { title: ' Hello ', content: 'Body', category: 'Tech', tags: ['JS', 'js', 'Node'] };

describe('parsePostInput', () => {
  it('trims strings and lowercases/dedupes tags', () => {
    const result = parsePostInput(valid);
    expect(result).toEqual({
      ok: true,
      data: { title: 'Hello', content: 'Body', category: 'Tech', tags: ['js', 'node'] },
    });
  });

  it('allows an empty tags array', () => {
    expect(parsePostInput({ ...valid, tags: [] }).ok).toBe(true);
  });

  it('reports every invalid field', () => {
    const result = parsePostInput({ title: '  ', content: 5, tags: 'js' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field).sort()).toEqual(['category', 'content', 'tags', 'title']);
    }
  });

  it('rejects non-object bodies', () => {
    for (const body of [undefined, null, 'text', []]) {
      const result = parsePostInput(body);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects non-string and too long tags', () => {
    expect(parsePostInput({ ...valid, tags: [1] }).ok).toBe(false);
    expect(parsePostInput({ ...valid, tags: ['x'.repeat(51)] }).ok).toBe(false);
  });
});

describe('parseId', () => {
  it('accepts positive integers only', () => {
    expect(parseId('42')).toBe(42);
    for (const bad of ['0', '-1', '1.5', 'abc', '01', '12345678901', '']) {
      expect(parseId(bad)).toBeNull();
    }
  });
});
