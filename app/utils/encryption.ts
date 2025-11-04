import { Buffer } from 'buffer';

// This would typically come from your environment variables or a secure configuration
const PUBLIC_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

function pemToArrayBuffer(pem: string) {

  // Extract the base64 content between the markers, handling both single-line and multi-line formats
  const matches = pem.match(/-----BEGIN PUBLIC KEY-----(?:[\r\n]+)?([\s\S]*?)(?:[\r\n]+)?-----END PUBLIC KEY-----/);
  if (!matches || !matches[1]) {
    throw new Error('Invalid PEM format: Could not extract key content');
  }

  // Get the base64 content and remove any whitespace
  const base64 = matches[1].replace(/\s/g, '');
  

  // Decode base64 to binary
  const binary = atob(base64);
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
      throw new Error('Invalid encryption key format. Key must be base64 encoded.');
    }

    // Import the public key
    let publicKey: CryptoKey;
    try {
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
    } catch (error) {
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
    throw error; // Throw the original error for better debugging
  }
}
