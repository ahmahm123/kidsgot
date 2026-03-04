export function sanitizeText(input: string) {
  return input
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeStringArray(values: string[]) {
  return values.map(sanitizeText).filter(Boolean);
}
