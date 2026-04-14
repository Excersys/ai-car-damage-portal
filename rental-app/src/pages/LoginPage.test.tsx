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
      data: { accessToken: 'test-jwt' },
    })

    // Prevent actual navigation
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(getEmailInput(), { target: { value: 'test@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'password123' } })

    const submitBtn = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({ email: 'test@test.com' })
      )
    })

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('test-jwt')
    })
  })

  it('shows error when login fails with response error', async () => {
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(getEmailInput(), { target: { value: 'bad@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    })
  })

  it('shows error when login fails with Error instance', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'))

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(getEmailInput(), { target: { value: 'bad@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    })
  })

  it('shows fallback error for unknown error shape', async () => {
    mockPost.mockRejectedValueOnce('something weird')

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(getEmailInput(), { target: { value: 'bad@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('An unexpected error occurred')
    })
  })

  it('shows signup form fields when toggled to register mode', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/sign up/i))

    expect(document.querySelector('input[name="firstName"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="lastName"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="phone"]')).toBeInTheDocument()
    expect(document.querySelector('input[name="confirmPassword"]')).toBeInTheDocument()
  })

  it('shows password mismatch error on signup', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/sign up/i))

    fireEvent.change(getEmailInput(), { target: { value: 'new@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'password1' } })
    fireEvent.change(document.querySelector('input[name="confirmPassword"]')!, {
      target: { value: 'password2' },
    })
    fireEvent.change(document.querySelector('input[name="firstName"]')!, { target: { value: 'John' } })
    fireEvent.change(document.querySelector('input[name="lastName"]')!, { target: { value: 'Doe' } })
    fireEvent.change(document.querySelector('input[name="phone"]')!, { target: { value: '555' } })

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match')
    })
  })

  it('calls register endpoint on successful signup', async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: 'new-token' },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/sign up/i))

    fireEvent.change(document.querySelector('input[name="firstName"]')!, { target: { value: 'John' } })
    fireEvent.change(document.querySelector('input[name="lastName"]')!, { target: { value: 'Doe' } })
    fireEvent.change(document.querySelector('input[name="phone"]')!, { target: { value: '555-1234' } })
    fireEvent.change(getEmailInput(), { target: { value: 'new@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'password1' } })
    fireEvent.change(document.querySelector('input[name="confirmPassword"]')!, {
      target: { value: 'password1' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({
          email: 'new@test.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '555-1234',
        })
      )
    })

    // After successful registration, should switch back to login view
    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    })
  })

  it('handles register without accessToken in response', async () => {
    mockPost.mockResolvedValueOnce({
      data: {},
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/sign up/i))

    fireEvent.change(document.querySelector('input[name="firstName"]')!, { target: { value: 'John' } })
    fireEvent.change(document.querySelector('input[name="lastName"]')!, { target: { value: 'Doe' } })
    fireEvent.change(document.querySelector('input[name="phone"]')!, { target: { value: '555-1234' } })
    fireEvent.change(getEmailInput(), { target: { value: 'new@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'password1' } })
    fireEvent.change(document.querySelector('input[name="confirmPassword"]')!, {
      target: { value: 'password1' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    })

    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('toggles back from signup to login', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText(/sign up/i))
    expect(screen.getByRole('heading', { name: /Create Account/ })).toBeInTheDocument()

    fireEvent.click(screen.getByText(/sign in/i))
    expect(screen.getByRole('heading', { name: /Welcome Back/ })).toBeInTheDocument()
  })

  it('shows loading state during submission', async () => {
    let resolvePost: Function
    mockPost.mockReturnValueOnce(
      new Promise(res => {
        resolvePost = res
      })
    )

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    fireEvent.change(getEmailInput(), { target: { value: 'test@test.com' } })
    fireEvent.change(getPasswordInput(), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Please wait/i })).toBeDisabled()
    })

    resolvePost!({ data: { accessToken: 'tok' } })

    await waitFor(() => {
      expect(screen.queryByText('Please wait...')).not.toBeInTheDocument()
    })
  })
})
