import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the ready state', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /react setup is ready/i })).toBeInTheDocument()
  })
})
