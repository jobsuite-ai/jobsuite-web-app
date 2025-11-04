import { jwtVerify } from 'jose';

// Public key from the key pair we generated
const JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAwCfCtf+Wcy5Zca/mMme3
HyFbHZfqJULjZ/MNtypdRNmGtQzu41rPdvpZjbtItOTioHyLSpBPRWSoLlC+6B2n
Og8WHLxe1XX00hDZVkA75jb/CbANf19lZQaq3swZkEbQ5LtzdPYo0SVfmlGTJBFm
j6+nkz+ew377RICE2I7eNGi+CSGNBgZ28h8qcaSkpAWgxVSmyU8P3AMQsY3z+Ekl
PIV6T18wj809Ud1VRAYh/mblwAZzG0aQV5c0jvGcdYw3WgC+NkXWzIMN0lw6Bcbf
rhUBraTHj94Mwa16yIFedvuUFFe2lGmTWOSWSBAQUiUgsaG2a4cF3nqNtgF5OWyV
mQ8FMynb9cJR1nhkSw46pTOn6Q1BCEUt999kwJcGban2J3a7eyn6X2wHo+KY+mWt
QQrxB7fO+XNrKQ0eJxGRGDbW4N+bbPo4JxDiQIIyOGfUj3SewbuzZJbXkprsHUD0
gykLp5aTCIwkc8lA2wQywVpH5fdkjndUoJc/sym2JRJ7ChxMMD8324QI3pzV03wM
S8z/rpmmvQyT/0wQATjxukeK/4OJNw4OOr6PdBZhMO1b9rtxHIVZHPrpYBWdQfd2
DD4hiPpAZd2MbsfTmYgmUnc8vKx5fKVhudAIyU1LfMBQqlwu/qOQEIG/X5bIgQlC
dtqhodxVFQld9DEMSzSptRUCAwEAAQ==
-----END PUBLIC KEY-----`;

async function decryptToken(token: string) {
  try {
    // Debug: Print the key being used
    console.log('Using public key:', JWT_PUBLIC_KEY);
    
    // Verify and decode the token
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_PUBLIC_KEY), {
      algorithms: ['RS256']
    });
    
    // Check if token is expired
    const expiryDate = new Date(payload.exp! * 1000); // Convert from seconds to milliseconds
    if (expiryDate < new Date()) {
      throw new Error('Token has expired');
    }
    
    console.log('Decrypted token:', payload);
    return payload;
  } catch (error: any) {
    console.error('Error decrypting token:', error);
    throw error;
  }
}

async function main() {
  try {
    // Replace this with a new token from the backend
    const token = "_p67WHgkeDLjSV7-d2CaL5xcBptQ9i2JbIFRT3dEvWQBdAzYm_vO-8hC5BWNhsXq_F_-uPIx4mRLsbXU5QkmAQB1m_an1oCRXN3TnoFeKWtEHC0BP1DtD-npE3s44bT8eO_Ht_p3xlgk2KUO23PWrlQUv8DEhZG0m-Ug_R8MKol1Y7iy4teEKfmRSCs4DqHx-36cC87Pm2eO-FaxUm3phJ8bvsHYBrvRsOsTCD5d_STmC_OylDRvQuBAVemsTKKruiof0X3b_8HFd2Im7aJrrBkvbQx0VhvJfVHQovGe87IYydPfWta1k9-PmjXo4S5c"
    console.log('Using hardcoded token:', token);
    console.log('Token length:', token.length);
    
    // Debug: Print the exact token string
    console.log('Exact token string:', JSON.stringify(token));
    
    // Test the token
    await decryptToken(token);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 