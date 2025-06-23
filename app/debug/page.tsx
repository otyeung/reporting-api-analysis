'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [providers, setProviders] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadProviders = async () => {
      const providers = await getProviders()
      console.log('Available providers:', providers)
      setProviders(providers)
    }
    loadProviders()
  }, [])

  const handleClientSignIn = async () => {
    setIsLoading(true)
    console.log('Attempting client sign-in...')

    try {
      await signIn('linkedin', {
        callbackUrl: '/',
        redirect: true,
      })
    } catch (error) {
      console.error('Client sign-in error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>Debug OAuth</h1>

      <div className='space-y-4'>
        <div>
          <h2 className='text-lg font-semibold'>Available Providers:</h2>
          <pre className='bg-gray-100 p-2 rounded'>
            {JSON.stringify(providers, null, 2)}
          </pre>
        </div>

        <div className='space-x-4'>
          <button
            onClick={handleClientSignIn}
            disabled={isLoading}
            className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600'
          >
            {isLoading ? 'Signing in...' : 'Sign in with LinkedIn'}
          </button>
        </div>

        <div>
          <p className='text-sm text-gray-600'>
            Check browser console for debug information
          </p>
        </div>
      </div>
    </div>
  )
}
