'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

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

export default function TokenIntrospectionPage() {
  const { data: session, status } = useSession()
  const [introspectionData, setIntrospectionData] =
    useState<TokenIntrospectionResult | null>(null)
  const [isIntrospecting, setIsIntrospecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const introspectToken = async () => {
    if (!session?.accessToken) {
      setError('No access token available')
      return
    }

    setIsIntrospecting(true)
    setError(null)

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
      setError(error instanceof Error ? error.message : 'Introspection failed')
    } finally {
      setIsIntrospecting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-4xl mx-auto py-8 px-4'>
          <div className='text-center'>Loading...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-4xl mx-auto py-8 px-4'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-gray-900 mb-4'>
              Token Introspection
            </h1>
            <p className='text-gray-600 mb-6'>
              Please sign in to introspect your LinkedIn token.
            </p>
            <button
              onClick={() => signIn('linkedin')}
              className='bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700'
            >
              Sign In with LinkedIn
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-4xl mx-auto py-8 px-4'>
        <div className='bg-white shadow rounded-lg p-6'>
          <div className='flex justify-between items-center mb-6'>
            <h1 className='text-2xl font-bold text-gray-900'>
              LinkedIn Token Introspection
            </h1>
            <button
              onClick={introspectToken}
              disabled={isIntrospecting}
              className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isIntrospecting ? (
                <>
                  <svg
                    className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
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
                  Introspecting...
                </>
              ) : (
                <>
                  <svg
                    className='mr-2 h-4 w-4'
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
                  Introspect Current Token
                </>
              )}
            </button>
          </div>

          <div className='mb-6'>
            <p className='text-gray-600'>
              This tool allows you to introspect your current LinkedIn access
              token to view its status, expiry, scopes, and other metadata using
              LinkedIn's official introspection API.
            </p>
          </div>

          {error && (
            <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-md'>
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
                  <h3 className='text-sm font-medium text-red-800'>Error</h3>
                  <div className='mt-2 text-sm text-red-700'>
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {introspectionData && (
            <div className='bg-gray-50 border border-gray-200 rounded-lg p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                Token Details
              </h2>

              {/* Token Status Warning for Inactive/Revoked Tokens */}
              {(!introspectionData.active ||
                introspectionData.status === 'revoked' ||
                introspectionData.status === 'expired') && (
                <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-md'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <svg
                        className='h-5 w-5 text-red-400'
                        viewBox='0 0 20 20'
                        fill='currentColor'
                      >
                        <path
                          fillRule='evenodd'
                          d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </div>
                    <div className='ml-3'>
                      <h3 className='text-sm font-medium text-red-800'>
                        Token Issue Detected
                      </h3>
                      <div className='mt-2 text-sm text-red-700'>
                        <p>
                          Your LinkedIn token is{' '}
                          {introspectionData.status || 'inactive'}. To restore
                          access to LinkedIn APIs, please sign out and sign in
                          again.
                        </p>
                        <div className='mt-3'>
                          <button
                            onClick={() =>
                              signOut({
                                callbackUrl:
                                  '/auth/signin?message=token-refresh',
                              })
                            }
                            className='inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
                          >
                            <svg
                              className='mr-2 h-4 w-4'
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
                            Sign Out & Sign In Again
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Status and Basic Info */}
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-500'>
                      Status
                    </label>
                    <div className='mt-1'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          introspectionData.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {introspectionData.status ||
                          (introspectionData.active ? 'Active' : 'Inactive')}
                      </span>
                    </div>
                  </div>

                  {introspectionData.auth_type && (
                    <div>
                      <label className='block text-sm font-medium text-gray-500'>
                        Authentication Type
                      </label>
                      <div className='mt-1 text-sm text-gray-900'>
                        {introspectionData.auth_type}
                      </div>
                    </div>
                  )}

                  {introspectionData.client_id && (
                    <div>
                      <label className='block text-sm font-medium text-gray-500'>
                        Client ID
                      </label>
                      <div className='mt-1 text-sm text-gray-900 font-mono'>
                        {introspectionData.client_id}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing Information */}
                <div className='space-y-4'>
                  {introspectionData.created_at && (
                    <div>
                      <label className='block text-sm font-medium text-gray-500'>
                        Created At
                      </label>
                      <div className='mt-1 text-sm text-gray-900'>
                        {new Date(
                          introspectionData.created_at * 1000
                        ).toLocaleString()}
                      </div>
                      {introspectionData.computed?.ageInDays && (
                        <div className='text-xs text-gray-500'>
                          ({introspectionData.computed.ageInDays} days ago)
                        </div>
                      )}
                    </div>
                  )}

                  {introspectionData.expires_at && (
                    <div>
                      <label className='block text-sm font-medium text-gray-500'>
                        Expires At
                      </label>
                      <div className='mt-1 text-sm text-gray-900'>
                        {new Date(
                          introspectionData.expires_at * 1000
                        ).toLocaleString()}
                      </div>
                      {introspectionData.computed?.expiresInDays !== null &&
                        introspectionData.computed?.expiresInDays !==
                          undefined && (
                          <div
                            className={`text-xs ${
                              introspectionData.computed.expiresInDays <= 7
                                ? 'text-yellow-600 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            (
                            {introspectionData.computed.expiresInDays > 0
                              ? `${introspectionData.computed.expiresInDays} days remaining`
                              : 'Expired'}
                            )
                          </div>
                        )}
                    </div>
                  )}

                  {introspectionData.authorized_at && (
                    <div>
                      <label className='block text-sm font-medium text-gray-500'>
                        Authorized At
                      </label>
                      <div className='mt-1 text-sm text-gray-900'>
                        {new Date(
                          introspectionData.authorized_at * 1000
                        ).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scopes */}
              {introspectionData.scope && (
                <div className='mt-6 pt-6 border-t border-gray-200'>
                  <label className='block text-sm font-medium text-gray-500 mb-3'>
                    Granted Scopes
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {introspectionData.scope.split(',').map((scope, index) => (
                      <span
                        key={index}
                        className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
                      >
                        {scope.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Response */}
              <div className='mt-6 pt-6 border-t border-gray-200'>
                <details className='group'>
                  <summary className='cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700'>
                    View Raw Response
                  </summary>
                  <div className='mt-3 p-4 bg-gray-900 rounded-md overflow-auto'>
                    <pre className='text-xs text-green-400'>
                      {JSON.stringify(introspectionData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
