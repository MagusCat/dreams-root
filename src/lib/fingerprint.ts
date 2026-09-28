// Soft-dedup device fingerprint (SHA-256). NOT an identity (identical devices
// collide) and non-invasive on purpose (no canvas/WebGL/audio/font probing).
export async function computeFingerprint(): Promise<string | null> {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number }
    const signals = [
      nav.userAgent,
      nav.language,
      (nav.languages ?? []).join(','),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      String(window.devicePixelRatio),
      String(nav.hardwareConcurrency ?? ''),
      String(nav.maxTouchPoints ?? ''),
      String(nav.deviceMemory ?? ''),
    ].join('|')

    const bytes = new TextEncoder().encode(signals)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return null
  }
}

// Source tag from the URL (?origin=…), e.g. a university.
export function readOrigin(): string | null {
  const raw = new URLSearchParams(window.location.search).get('origin')
  return raw ? raw.trim().slice(0, 64) : null
}
