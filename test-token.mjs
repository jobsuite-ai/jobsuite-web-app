import { jwtVerify, createRemoteJWKSet } from 'jose';

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

const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3N";

async function main() {
  try {
    console.log('Using public key:', JWT_PUBLIC_KEY);
    console.log('Using token:', token);
    
    const { payload } = await jwtVerify(token, JWT_PUBLIC_KEY, {
      algorithms: ['RS256']
    });
    
    console.log('Decrypted token payload:', payload);
  } catch (error) {
    console.error('Error verifying token:', error);
    if (error.code === 'ERR_JWS_INVALID') {
      console.error('Token format is invalid. Make sure the token is complete and not truncated.');
    }
    process.exit(1);
  }
}

main(); 