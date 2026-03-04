export type CursorPageResult<T> = {
  items: T[];
  nextCursor: string | null;
};

export function decodeCursor(cursor?: string | null) {
  if (!cursor) {
    return null;
  }
  return cursor;
}

export function encodeCursor(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return value;
}
