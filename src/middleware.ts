import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'

export async function middleware(request: NextRequest) {
  try {
    // Use the client creator from lib
    const { supabase, response } = createMiddlewareClient(request)
    
    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession()
    
    // Check if accessing admin routes without authentication
    const url = request.nextUrl.clone()
    if (url.pathname.startsWith('/admin')) {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        url.pathname = '/login'
        url.searchParams.set('message', 'Please login to access the admin area')
        return NextResponse.redirect(url)
      }
    }
    
    return response
  } catch (e) {
    console.error('Middleware error:', e)
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }
}

// Add a config to specify which routes this middleware should run on
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
