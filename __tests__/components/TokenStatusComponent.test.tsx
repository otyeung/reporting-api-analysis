import { render, screen, fireEvent } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import TokenStatusComponent from '../../app/components/TokenStatusComponent'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock fetch for introspection tests
global.fetch = jest.fn()

describe('TokenStatusComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render nothing when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    const { container } = render(<TokenStatusComponent />)
    expect(container.firstChild).toBeNull()
  })

  it('should render nothing when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { container } = render(<TokenStatusComponent />)
    expect(container.firstChild).toBeNull()
  })

  it('should render token status for authenticated user', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
        tokenStatus: {
          isNearExpiry: false,
          expiresInDays: 30,
          message: 'Token is valid',
        },
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<TokenStatusComponent />)

    expect(screen.getByText('Token valid')).toBeDefined()
  })

  it('should show warning for tokens near expiry', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
        tokenStatus: {
          isNearExpiry: true,
          expiresInDays: 5,
          message: 'Token expires soon',
        },
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<TokenStatusComponent />)

    expect(screen.getByText('Token expires soon')).toBeDefined()
  })

  it('should handle session errors', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Test User', email: 'test@example.com' },
        accessToken: 'test-token',
        expires: '2024-12-31',
        error: 'RefreshTokenExpired',
        errorMessage: 'Token has expired',
      },
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<TokenStatusComponent />)

    expect(screen.getByText('Session Expired')).toBeDefined()
    expect(screen.getByText('Token has expired')).toBeDefined()
  })
})
