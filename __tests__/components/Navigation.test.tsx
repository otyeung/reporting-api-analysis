import { render, screen, fireEvent } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Navigation from '../../app/components/Navigation'

// Mock next-auth
jest.mock('next-auth/react')
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

// Mock next/navigation
jest.mock('next/navigation')
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => {
    return (
      <a href={href} className={className} data-testid={`link-${href}`}>
        {children}
      </a>
    )
  }
})

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render on auth pages', () => {
    mockUsePathname.mockReturnValue('/auth/signin')
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    const { container } = render(<Navigation />)
    expect(container.firstChild).toBeNull()
  })

  it('should render navigation for authenticated user', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'John Doe', email: 'john@example.com' },
        expires: '2024-12-31',
      } as any,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Navigation />)

    expect(screen.getByText('LinkedIn Analytics')).toBeInTheDocument()
    expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('should render sign in button for unauthenticated user', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<Navigation />)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: jest.fn(),
    })

    render(<Navigation />)

    const loadingElement = document.querySelector('.animate-pulse')
    expect(loadingElement).toBeInTheDocument()
  })

  it('should highlight active navigation item', () => {
    mockUsePathname.mockReturnValue('/session-debug')
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<Navigation />)

    const sessionDebugLink = screen.getByTestId('link-/session-debug')
    expect(sessionDebugLink).toHaveClass('bg-blue-100')
    expect(sessionDebugLink).toHaveClass('text-blue-700')
  })

  it('should call signOut when sign out button is clicked', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'John Doe', email: 'john@example.com' },
        expires: '2024-12-31',
      } as any,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Navigation />)

    const signOutButton = screen.getByText('Sign Out')
    fireEvent.click(signOutButton)

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('should handle user without name', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseSession.mockReturnValue({
      data: {
        user: { email: 'john@example.com' },
        expires: '2024-12-31',
      } as any,
      status: 'authenticated',
      update: jest.fn(),
    })

    render(<Navigation />)

    expect(screen.getByText('Welcome, User')).toBeInTheDocument()
  })

  it('should render all navigation links', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    })

    render(<Navigation />)

    // Check for brand link and navigation items by text content to avoid duplicate test ID issues
    expect(screen.getByText('LinkedIn Analytics')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Session Debug')).toBeInTheDocument()
    expect(screen.getByText('OAuth Debug')).toBeInTheDocument()
    expect(screen.getByText('Token Inspector')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })
})
