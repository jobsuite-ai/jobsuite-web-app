import { Buffer } from 'buffer';

// This would typically come from your environment variables or a secure configuration
const PUBLIC_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

function pemToArrayBuffer(pem: string) {
  console.log('Input PEM:', pem);
  console.log('Input PEM length:', pem.length);
  console.log('Input PEM starts with:', pem.substring(0, 50));

  // Extract the base64 content between the markers, handling both single-line and multi-line formats
  const matches = pem.match(/-----BEGIN PUBLIC KEY-----(?:[\r\n]+)?([\s\S]*?)(?:[\r\n]+)?-----END PUBLIC KEY-----/);
  if (!matches || !matches[1]) {
    throw new Error('Invalid PEM format: Could not extract key content');
  }

  // Get the base64 content and remove any whitespace
  const base64 = matches[1].replace(/\s/g, '');
  
  console.log('Base64 length:', base64.length);
  console.log('Base64 starts with:', base64.substring(0, 50));

  // Decode base64 to binary
  const binary = atob(base64);
  console.log('Binary length:', binary.length);
  console.log('First few bytes:', Array.from(binary.slice(0, 10)).map(b => b.charCodeAt(0)));

  // Check if the key already has the SPKI wrapper (starts with sequence 0x30)
  const firstByte = binary.charCodeAt(0);
  let finalBinary = binary;
  
  if (firstByte !== 0x30) {
    // If not, wrap it in a proper SPKI structure
    // This is a simplified version - in production, you should use a proper ASN.1 library
    const keyLength = binary.length;
    const totalLength = keyLength + 2; // +2 for the sequence tag and length byte
    
    // Create a new binary string with the SPKI wrapper
    finalBinary = String.fromCharCode(0x30, totalLength) + binary;
  }

  const buffer = new ArrayBuffer(finalBinary.length);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < finalBinary.length; i++) {
    view[i] = finalBinary.charCodeAt(i);
  }

  console.log('Final buffer length:', buffer.byteLength);
  console.log('First few bytes of buffer:', Array.from(new Uint8Array(buffer.slice(0, 10))));

  return buffer;
}

export async function encryptPassword(password: string): Promise<string> {
  try {
    if (!PUBLIC_KEY) {
      throw new Error('Encryption key is not set. Please set NEXT_PUBLIC_ENCRYPTION_KEY environment variable.');
    }

    if (!password) {
      throw new Error('Password cannot be empty');
    }

    // Convert the public key from base64 to ArrayBuffer
    let keyData: ArrayBuffer;
    try {
      keyData = pemToArrayBuffer(PUBLIC_KEY);
    } catch (error) {
      console.error('Key parsing error:', error);
      throw new Error('Invalid encryption key format. Key must be base64 encoded.');
    }

    // Import the public key
    let publicKey: CryptoKey;
    try {
      console.log('Attempting to import key...');
      publicKey = await window.crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );
      console.log('Key imported successfully');
    } catch (error) {
      console.error('Key import error details:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
      throw new Error('Invalid RSA public key format. Key must be in SPKI format.');
    }

    // Convert password to ArrayBuffer
    const passwordBuffer = new TextEncoder().encode(password);

    // Encrypt the password
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      passwordBuffer
    );

    // Convert the encrypted data to base64
    return Buffer.from(encryptedBuffer).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw error; // Throw the original error for better debugging
  }
}
