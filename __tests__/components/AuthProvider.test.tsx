import { render, screen } from '@testing-library/react'
import AuthProvider from '../../app/components/AuthProvider'

// Mock SessionProvider
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='session-provider'>{children}</div>
  ),
}))

describe('AuthProvider', () => {
  it('should render children wrapped in SessionProvider', () => {
    render(
      <AuthProvider>
        <div data-testid='test-child'>Test Child</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    render(
      <AuthProvider>
        <div data-testid='child-1'>Child 1</div>
        <div data-testid='child-2'>Child 2</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })
})
