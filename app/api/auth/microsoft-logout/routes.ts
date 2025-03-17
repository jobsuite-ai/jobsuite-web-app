import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear any session cookies or local authentication state
  res.setHeader('Set-Cookie', [
    'auth-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    'msal.idtoken=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  ]);

  // Respond with a simple HTML page that clears sessionStorage
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Logging out...</title>
        <script>
          // Clear MSAL cache from sessionStorage
          sessionStorage.clear();
          
          // Redirect to home page after logout
          window.location.href = '/';
        </script>
      </head>
      <body>
        <p>Logging out...</p>
      </body>
    </html>
  `);
}
