// Attention check: a random emoji is shown at welcome and recalled before the
// end. The challenge (shown + 4 options) is created once and persisted so it
// survives reloads and both screens agree.
const POOL = ['🌙', '⭐', '🚀', '🐱', '🌈', '🍀', '🎈', '🔮', '🦋', '🌸', '⚡', '🍦', '🐢', '🎧', '🌵', '🍕']
const KEY = 'dreams:emoji'

export type EmojiChallenge = { shown: string; options: string[] }

const shuffle = <T,>(a: readonly T[]): T[] =>
  a
    .map((v) => [Math.random(), v] as const)
    .sort((x, y) => x[0] - y[0])
    .map(([, v]) => v)

export function getEmojiChallenge(): EmojiChallenge {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as EmojiChallenge
  } catch {
    /* ignore */
  }
  const pool = shuffle(POOL)
  const challenge: EmojiChallenge = { shown: pool[0], options: shuffle(pool.slice(0, 4)) }
  try {
    localStorage.setItem(KEY, JSON.stringify(challenge))
  } catch {
    /* ignore */
  }
  return challenge
}
