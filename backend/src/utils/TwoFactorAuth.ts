import speakeasy from 'speakeasy';

// Generate a secret key for 2FA
export const generateSecretKey = (): string => {
    return speakeasy.generateSecret({ length: 20 }).base32;
};

// Verify a TOTP code
export const verifyTotp = (secretKey: string, token: string): boolean => {
    return speakeasy.totp.verify({
        secret: secretKey,
        encoding: 'base32',
        token: token,
        window: 1, // Allows for slight clock drift
    });
};