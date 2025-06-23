'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Don't show navigation on sign-in pages
  if (pathname?.startsWith('/auth/')) {
    return null
  }

  return (
    <nav className='bg-white shadow-sm border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex items-center space-x-8'>
            <Link href='/' className='text-xl font-bold text-blue-600'>
              LinkedIn Analytics
            </Link>

            <div className='flex space-x-4'>
              <Link
                href='/'
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </Link>

              <Link
                href='/session-debug'
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/session-debug'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Session Debug
              </Link>

              <Link
                href='/debug'
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/debug'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                OAuth Debug
              </Link>
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            {status === 'loading' ? (
              <div className='h-4 w-20 bg-gray-200 rounded animate-pulse'></div>
            ) : session ? (
              <div className='flex items-center space-x-4'>
                <span className='text-sm text-gray-700'>
                  Welcome, {session.user?.name || 'User'}
                </span>
                <button
                  onClick={() => signOut()}
                  className='bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700'
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href='/auth/signin'
                className='bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700'
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
