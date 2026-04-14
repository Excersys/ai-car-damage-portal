import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}))

vi.mock('../config/api', () => ({
  apiClient: { post: mockPost },
}))

import LoginPage from './LoginPage'

function getEmailInput() {
  return document.querySelector('input[name="email"]') as HTMLInputElement
}

function getPasswordInput() {
  return document.querySelector('input[name="password"]') as HTMLInputElement
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockPost.mockReset()
    localStorage.clear()
  })

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })

  it('has email and password inputs', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    expect(getEmailInput()).toBeTruthy()
    expect(getPasswordInput()).toBeTruthy()
  })

  it('can toggle between login and register modes', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()

    const toggleLink = screen.getByText(/sign up/i)
    fireEvent.click(toggleLink)

    // After toggling, the heading should change
    expect(screen.getByRole('heading', { name: /Create Account/i })).toBeInTheDocument()
  })

  it('has a sign in button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('calls apiClient.post for login on form submit', async () => {
    mockPost.mockResolvedValueOnce({
      data: { token: 'test-jwt', user: { email: 'test@test.com' } },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(getEmailInput(), {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(getPasswordInput(), {
      target: { value: 'password123' },
    })

    const submitBtn = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({ email: 'test@test.com' })
      )
    })
  })
})
