import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Handle PostHog proxy for /ingest paths
  if (pathname.startsWith('/ingest')) {
    const url = request.nextUrl.clone()
    // Use eu instead of us for EU cloud
    const hostname = pathname.startsWith("/ingest/static/") 
      ? 'eu-assets.i.posthog.com' 
      : 'eu.i.posthog.com'
    
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('host', hostname)

    // Remove the /ingest prefix
    url.protocol = 'https'
    url.hostname = hostname
    url.port = '443'
    url.pathname = url.pathname.replace(/^\/ingest/, '')

    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders
      }
    })
  }

  // Handle authentication for non-PostHog routes
  const token = request.cookies.get('token')
  const publicPaths = ['/login', '/signup']
  const isPublicPath = publicPaths.includes(pathname)

  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    
    // Clear any existing cookies on redirect to login
    response.cookies.delete('token')
    response.cookies.delete('session')
    response.cookies.delete('session_id')
    
    return response
  }

  // Redirect to chat if accessing login with valid token
  if (token && isPublicPath) {
    const chatUrl = new URL('/', request.url)
    return NextResponse.redirect(chatUrl)
  }

  // For all other routes, add security headers
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    // Match PostHog paths
    '/ingest/:path*',
    // Match all other paths except static assets and api
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ]
} 