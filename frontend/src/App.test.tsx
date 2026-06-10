import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App', () => {
  it('renders the mobilization console', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: /multi-model confidence for commissioning investigations/i,
      }),
    ).toBeInTheDocument()
  })
})
