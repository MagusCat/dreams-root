import raw from './flow.json'
import { flowSchema, type Flow } from './schema'

// Validate flow.json at load so a malformed edit fails loudly, not on screen.
export const flow: Flow = flowSchema.parse(raw)

