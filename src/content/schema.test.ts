import { test } from 'node:test'
import assert from 'node:assert/strict'
import flow from './flow.json' with { type: 'json' }
import { cptParamsSchema } from './schema.ts'

const ok = flow.cpt.params
const rejects = (patch: Record<string, unknown>) => assert.equal(cptParamsSchema.safeParse({ ...ok, ...patch }).success, false)

test('the shipped CPT params are valid', () => {
  assert.equal(cptParamsSchema.safeParse(ok).success, true)
})

test('rejects a window that reaches the next stimulus', () => {
  rejects({ windowMs: 920 }) // = exposure 690 + blank 230
  rejects({ windowMs: 900, jitterMs: 10 }) // 920 − 2×10 = 900
})

test('rejects the other invalid configs', () => {
  rejects({ targetsPerBlock: 31 })
  rejects({ anticipationMs: 850 })
  rejects({ allowedInputs: [] })
  rejects({ allowedInputs: ['mouse'] })
  rejects({ exposureMs: 690.5 })
  rejects({ blankMs: 0 })
})
