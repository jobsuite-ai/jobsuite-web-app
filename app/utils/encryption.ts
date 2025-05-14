import { Buffer } from 'buffer';

// This would typically come from your environment variables or a secure configuration
const PUBLIC_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || '';

export async function encryptPassword(password: string): Promise<string> {
  try {
    // Convert the public key from base64 to ArrayBuffer
    const keyData = Buffer.from(PUBLIC_KEY, 'base64');
    
    // Import the public key
    const publicKey = await window.crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    );

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
    throw new Error('Failed to encrypt password');
  }
} 