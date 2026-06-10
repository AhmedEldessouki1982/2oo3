import { describe, expect, it } from 'vitest'

import { MODEL_PROVIDERS, createContextFingerprint } from './index'

describe('shared contracts', () => {
  it('keeps the MVP provider list explicit', () => {
    expect(MODEL_PROVIDERS).toEqual(['openai', 'anthropic', 'google'])
  })

  it('creates stable fingerprints for identical shared context', () => {
    const context = [
      {
        content: 'GT-1 lube oil pressure dropped during crank sequence.',
        source: 'prompt' as const,
      },
    ]

    expect(createContextFingerprint(context)).toBe(
      createContextFingerprint([...context]),
    )
  })
})
