import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase';

export async function middleware(request: NextRequest) {
  try {
    // Use the client creator from lib
    const { supabase, response } = createMiddlewareClient(request);

    // Refresh session if expired - required for Server Components
    await supabase.auth.getSession();

    // Check if accessing protected routes without authentication
    const url = request.nextUrl.clone();
    const { data: { session } } = await supabase.auth.getSession();

    // If user is authenticated and visiting the root path, redirect to rezervacije
    if (session && url.pathname === '/') {
      // Check if user is admin (has email) or regular user
      if (session.user.email) {
        url.pathname = '/admin';
      } else {
        url.pathname = '/rezervacije';
      }
      return NextResponse.redirect(url);
    }

    // Check if user is trying to access protected routes
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/rezervacije')) {
      if (!session && url.pathname.startsWith('/admin')) {
        // Redirect to login if not authenticated
        url.pathname = '/login';
        url.searchParams.set('message', 'Please login to access this area');
        return NextResponse.redirect(url);
      }

      if (!session && url.pathname.startsWith('/rezervacije')) {
        // Redirect to login if not authenticated
        url.pathname = '/';
        url.searchParams.set('message', 'Please login to access this area');
        return NextResponse.redirect(url);
      }

      // If user is authenticated with phone, only allow /rezervacije
      if (url.pathname.startsWith('/admin')) {
        const user = session.user;
        // Check if user authenticated with phone (no email)
        if (!user.email) {
          url.pathname = '/rezervacije';
          return NextResponse.redirect(url);
        }
      }
    }

    return response;
  } catch (e) {
    console.error('Middleware error:', e);
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}

// Update the config to include the root path
export const config = {
  matcher: ['/', '/admin/:path*', '/api/admin/:path*', '/rezervacije/:path*'],
};
