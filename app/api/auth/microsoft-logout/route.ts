import { NextResponse } from 'next/server';

export async function GET() {
  // Return a simple HTML page that redirects to the home page
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Logged Out</title>
        <meta http-equiv="refresh" content="0;url=/" />
      </head>
      <body>
        <p>You have been logged out. Redirecting to home page...</p>
        <script>
          window.location.href = '/';
        </script>
      </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
