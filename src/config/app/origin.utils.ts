export function normalizeOrigin(origin: string): string | undefined {
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return undefined;
  }
}

export function expandOriginPatterns(origins: string[]): string[] {
  return origins
    .map((origin) => normalizeOrigin(origin))
    .filter((origin): origin is string => !!origin);
}

export function isOriginAllowedByPatterns(origin: string, allowedOrigins: string[]) {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return false;
  }

  return allowedOrigins.includes(normalizedOrigin);
}
