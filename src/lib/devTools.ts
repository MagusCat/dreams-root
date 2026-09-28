// Dev-only helper tools (CPT skip button, live HUD, flow reset). Enabled in dev
// builds, but VITE_DEV_TOOLS=false turns them all off — e.g. a local build used
// with real participants where none of these must be reachable.
export const DEV_TOOLS = import.meta.env.DEV && import.meta.env.VITE_DEV_TOOLS !== 'false'
