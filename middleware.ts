// Specify which routes this middleware should run on
export const config = {
  matcher: [
    // Apply to all routes except static assets and images
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
    // Include API routes specifically to ensure they're handled properly
    '/api/:path*'
  ],
};