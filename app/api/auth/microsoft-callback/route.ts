import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the authorization code from the URL
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/auth-error?error=no_code', request.url));
    }

    // In a real implementation, you would:
    // 1. Validate the state parameter to prevent CSRF attacks
    // 2. Exchange the code for an access token
    // 3. Store the token securely (e.g., in a session)
    // 4. Redirect to the appropriate page

    // For now, we'll just redirect to a success page with a script to close the popup
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body>
          <h1>Authentication Successful</h1>
          <p>You can close this window now.</p>
          <script>
            // Notify the opener window that authentication is complete
            if (window.opener) {
              window.opener.postMessage({ type: 'MICROSOFT_AUTH_COMPLETE', success: true }, window.location.origin);
              // Close the popup window
              window.close();
            }
          </script>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error in Microsoft callback:', error);
    return NextResponse.redirect(new URL('/auth-error', request.url));
  }
}
