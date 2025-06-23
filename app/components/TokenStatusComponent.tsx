'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface TokenIntrospectionResult {
  active: boolean
  status: string
  scope?: string
  client_id?: string
  created_at?: number
  expires_at?: number
  authorized_at?: number
  auth_type?: string
  computed?: {
    isExpired: boolean
    expiresInDays: number | null
    ageInDays: number | null
  }
}

export default function TokenStatusComponent() {
  const { data: session, status } = useSession()
  const [showTokenInfo, setShowTokenInfo] = useState(false)
  const [introspectionData, setIntrospectionData] =
    useState<TokenIntrospectionResult | null>(null)
  const [isIntrospecting, setIsIntrospecting] = useState(false)
  const [introspectionError, setIntrospectionError] = useState<string | null>(
    null
  )

  // Handle token errors
  useEffect(() => {
    if (session?.error) {
      if (
        session.error === 'RefreshTokenExpired' ||
        session.error === 'RefreshAccessTokenError'
      ) {
        // Automatically sign out user when token refresh fails
        console.log('Token refresh failed, signing out user:', session.error)
        signOut({ callbackUrl: '/auth/signin?error=TokenExpired' })
      }
    }
  }, [session?.error])

  // Function to introspect the current token
  const introspectToken = async () => {
    if (!session?.accessToken) {
      setIntrospectionError('No access token available')
      return
    }

    setIsIntrospecting(true)
    setIntrospectionError(null)

    try {
      const response = await fetch('/api/linkedin-introspect', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setIntrospectionData(data)
    } catch (error) {
      console.error('Token introspection failed:', error)
      setIntrospectionError(
        error instanceof Error ? error.message : 'Introspection failed'
      )
    } finally {
      setIsIntrospecting(false)
    }
  }

  if (status === 'loading' || !session) {
    return null
  }

  // Show error message if there's a token error
  if (session.error) {
    return (
      <div className='bg-red-50 border border-red-200 rounded-md p-4 mb-4'>
        <div className='flex'>
          <div className='flex-shrink-0'>
            <svg
              className='h-5 w-5 text-red-400'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <div className='ml-3'>
            <h3 className='text-sm font-medium text-red-800'>
              Session Expired
            </h3>
            <div className='mt-2 text-sm text-red-700'>
              <p>{session.errorMessage}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Token Status Indicator */}
      {session.tokenStatus && (
        <div className='mb-4'>
          <button
            onClick={() => setShowTokenInfo(!showTokenInfo)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              session.tokenStatus.isNearExpiry
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                session.tokenStatus.isNearExpiry
                  ? 'bg-yellow-400'
                  : 'bg-green-400'
              }`}
            />
            {session.tokenStatus.isNearExpiry
              ? 'Token expires soon'
              : 'Token valid'}
            <svg
              className='ml-1 h-3 w-3'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d={showTokenInfo ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
              />
            </svg>
          </button>

          {/* Expandable Token Information */}
          {showTokenInfo && (
            <div className='mt-2 bg-gray-50 border border-gray-200 rounded-md p-3'>
              <div className='text-sm text-gray-700 space-y-2'>
                <div className='flex justify-between items-center'>
                  <span className='font-medium'>Token expires in:</span>
                  <span
                    className={
                      session.tokenStatus.expiresInDays <= 7
                        ? 'text-yellow-600 font-medium'
                        : 'text-green-600'
                    }
                  >
                    {session.tokenStatus.expiresInDays} days
                  </span>
                </div>

                {session.expiresAt && (
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>Expiry date:</span>
                    <span className='text-gray-600'>
                      {new Date(session.expiresAt * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className='pt-2 border-t border-gray-200'>
                  <div className='flex justify-between items-center mb-2'>
                    <p className='text-xs text-gray-500'>
                      {session.tokenStatus.message}
                    </p>
                    <button
                      onClick={introspectToken}
                      disabled={isIntrospecting}
                      className='inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {isIntrospecting ? (
                        <>
                          <svg
                            className='animate-spin -ml-1 mr-1 h-3 w-3 text-blue-700'
                            fill='none'
                            viewBox='0 0 24 24'
                          >
                            <circle
                              className='opacity-25'
                              cx='12'
                              cy='12'
                              r='10'
                              stroke='currentColor'
                              strokeWidth='4'
                            ></circle>
                            <path
                              className='opacity-75'
                              fill='currentColor'
                              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                            ></path>
                          </svg>
                          Checking...
                        </>
                      ) : (
                        <>
                          <svg
                            className='mr-1 h-3 w-3'
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                          </svg>
                          Introspect Token
                        </>
                      )}
                    </button>
                  </div>

                  {introspectionError && (
                    <div className='mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
                      {introspectionError}
                    </div>
                  )}

                  {introspectionData && (
                    <div className='mb-2 p-2 bg-blue-50 border border-blue-200 rounded'>
                      {/* Token Status Warning for Inactive/Revoked Tokens */}
                      {(!introspectionData.active ||
                        introspectionData.status === 'revoked' ||
                        introspectionData.status === 'expired') && (
                        <div className='mb-3 p-2 bg-red-50 border border-red-200 rounded'>
                          <div className='text-xs text-red-700'>
                            <div className='font-medium mb-1'>
                              ⚠️ Token Issue:
                            </div>
                            <div className='mb-2'>
                              Your token is{' '}
                              {introspectionData.status || 'inactive'}. Please
                              sign out and sign in again.
                            </div>
                            <button
                              onClick={() =>
                                signOut({
                                  callbackUrl:
                                    '/auth/signin?message=token-refresh',
                                })
                              }
                              className='inline-flex items-center px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700'
                            >
                              <svg
                                className='mr-1 h-3 w-3'
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                                />
                              </svg>
                              Sign Out & Retry
                            </button>
                          </div>
                        </div>
                      )}

                      <div className='text-xs space-y-1'>
                        <div className='font-medium text-blue-800 mb-2'>
                          Token Details:
                        </div>
                        <div className='grid grid-cols-2 gap-2 text-xs'>
                          <div>
                            <span className='font-medium'>Status:</span>
                            <span
                              className={`ml-1 px-1 rounded ${
                                introspectionData.active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {introspectionData.status ||
                                (introspectionData.active
                                  ? 'Active'
                                  : 'Inactive')}
                            </span>
                          </div>
                          {introspectionData.auth_type && (
                            <div>
                              <span className='font-medium'>Auth Type:</span>
                              <span className='ml-1'>
                                {introspectionData.auth_type}
                              </span>
                            </div>
                          )}
                          {introspectionData.computed?.ageInDays && (
                            <div>
                              <span className='font-medium'>Token Age:</span>
                              <span className='ml-1'>
                                {introspectionData.computed.ageInDays} days
                              </span>
                            </div>
                          )}
                          {introspectionData.computed?.expiresInDays && (
                            <div>
                              <span className='font-medium'>Expires In:</span>
                              <span
                                className={`ml-1 ${
                                  introspectionData.computed.expiresInDays <= 7
                                    ? 'text-yellow-600 font-medium'
                                    : ''
                                }`}
                              >
                                {introspectionData.computed.expiresInDays} days
                              </span>
                            </div>
                          )}
                        </div>
                        {introspectionData.scope && (
                          <div className='mt-2 pt-2 border-t border-blue-200'>
                            <div className='font-medium mb-1'>Scopes:</div>
                            <div className='flex flex-wrap gap-1'>
                              {introspectionData.scope
                                .split(',')
                                .map((scope, index) => (
                                  <span
                                    key={index}
                                    className='px-1 py-0.5 bg-blue-200 text-blue-800 rounded text-xs'
                                  >
                                    {scope.trim()}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {session.tokenStatus.isNearExpiry && (
                    <p className='text-xs text-yellow-600 mt-1'>
                      ⚡ Your token will be automatically refreshed when needed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
