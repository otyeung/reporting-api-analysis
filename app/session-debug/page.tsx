'use client'

import { useSession, signOut, signIn } from 'next-auth/react'
import { useState } from 'react'
import TokenStatusComponent from '../components/TokenStatusComponent'

export default function SessionDebug() {
  const { data: session, status } = useSession()
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const testLinkedInAPI = async () => {
    if (!session?.accessToken) {
      setTestResult({ error: 'No access token available' })
      return
    }

    setTesting(true)
    try {
      console.log('Testing LinkedIn API via server proxy...')

      // Call our server-side proxy instead of directly calling LinkedIn API
      const response = await fetch('/api/linkedin-profile', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('Server proxy response status:', response.status)

      let data
      const responseText = await response.text()
      console.log('Server proxy raw response:', responseText)

      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        setTestResult({
          status: response.status,
          success: false,
          error: 'Invalid JSON response from server',
          rawResponse: responseText,
          parseError:
            parseError instanceof Error
              ? parseError.message
              : 'Unknown parse error',
        })
        return
      }

      setTestResult({
        status: response.status,
        success: response.ok,
        data: data,
        rawResponse: responseText,
      })
    } catch (error) {
      console.error('LinkedIn API Test Error:', error)
      setTestResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'fetch_error',
      })
    } finally {
      setTesting(false)
    }
  }

  if (status === 'loading') {
    return <div className='p-8'>Loading...</div>
  }

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold text-gray-900 mb-8'>Session Debug</h1>

        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <h2 className='text-xl font-semibold mb-4'>Session Status</h2>
          <div className='space-y-2'>
            <p>
              <strong>Status:</strong> {status}
            </p>
            <p>
              <strong>Authenticated:</strong> {session ? 'Yes' : 'No'}
            </p>
            {session && (
              <>
                <p>
                  <strong>User ID:</strong>{' '}
                  {session.user?.id || 'Not available'}
                </p>
                <p>
                  <strong>Name:</strong> {session.user?.name || 'Not available'}
                </p>
                <p>
                  <strong>Email:</strong>{' '}
                  {session.user?.email || 'Not available'}
                </p>
                <p>
                  <strong>Access Token:</strong>{' '}
                  {session.accessToken ? 'Present' : 'Missing'}
                </p>
                <p>
                  <strong>Refresh Token:</strong>{' '}
                  {session.refreshToken ? 'Present' : 'Missing'}
                </p>
                <p>
                  <strong>Expires At:</strong>{' '}
                  {session.expiresAt
                    ? new Date(session.expiresAt * 1000).toLocaleString()
                    : 'Not available'}
                </p>
              </>
            )}
          </div>
        </div>

        {session && (
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>Full Session Object</h2>
            <pre className='bg-gray-100 p-4 rounded text-sm overflow-auto'>
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        {session?.accessToken && (
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>API Tests</h2>
            <div className='space-y-4'>
              <div>
                <button
                  onClick={testLinkedInAPI}
                  disabled={testing}
                  className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50'
                >
                  {testing ? 'Testing...' : 'Test LinkedIn Profile API'}
                </button>
              </div>
            </div>
          </div>
        )}

        {testResult && (
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>Test Result</h2>
            <pre className='bg-gray-100 p-4 rounded text-sm overflow-auto'>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}

        <div className='bg-white rounded-lg shadow-md p-6'>
          <h2 className='text-xl font-semibold mb-4'>Actions</h2>
          <div className='space-y-2'>
            <button
              onClick={() =>
                signIn('linkedin', { callbackUrl: '/', redirect: true })
              }
              className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2'
            >
              Sign In with LinkedIn
            </button>
            {session && (
              <button
                onClick={() => signOut()}
                className='bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700'
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
