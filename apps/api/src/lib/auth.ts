import crypto from 'node:crypto';
import { SignJWT, importPKCS8, importSPKI, jwtVerify, exportJWK } from 'jose';

const ACCESS_TOKEN_AUDIENCE = 'auth-service-api';
const ACCESS_TOKEN_EXPIRY = '15m';
const ID_TOKEN_EXPIRY = '15m';
const JWT_ALG = 'RS256';

// This is used for transforming our environment variables - changing \n to a newline
function normalisePem(value: string): string {
  return value.replace(/\\n/g, '\n');
}

// These next functions get our environment variables and change the \n to newlines
function getTokenIssuer(): string {
  if (!process.env.TOKEN_ISSUER) {
    throw new Error('Missing TOKEN_ISSUER');
  }
  return process.env.TOKEN_ISSUER;
}

function getPrivateKeyPem(): string {
  if (!process.env.JWT_PRIVATE_KEY) {
    throw new Error('Missing JWT_PRIVATE_KEY');
  }
  return normalisePem(process.env.JWT_PRIVATE_KEY);
}

function getPublicKeyPem(): string {
  if (!process.env.JWT_PUBLIC_KEY) {
    throw new Error('Missing JWT_PUBLIC_KEY');
  }
  return normalisePem(process.env.JWT_PUBLIC_KEY);
}

function getKeyId(): string {
  if (!process.env.JWT_KID) {
    throw new Error('Missing JWT_KID');
  }
  return process.env.JWT_KID;
}

// The next few lines are used to import our private and public keys just once
let signingKeyPromise: ReturnType<typeof importPKCS8> | null = null;
let verifyKeyPromise: ReturnType<typeof importSPKI> | null = null;

async function getSigningKey() {
  signingKeyPromise ??= importPKCS8(getPrivateKeyPem(), JWT_ALG);
  return signingKeyPromise;
}

async function getVerifyKey() {
  verifyKeyPromise ??= importSPKI(getPublicKeyPem(), JWT_ALG);
  return verifyKeyPromise;
}

// This creates a random token used as a refresh token
export function createOpaqueToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// This is used for storing hashed tokens
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// This is used for storing hashed client secrets
export function hashSecret(clientSecret: string): string {
  return crypto.createHash('sha256').update(clientSecret).digest('hex');
}

// This is used for validating provided client secrets
export function verifySecret(
  providedSecret: string,
  storedSecretHash: string,
): boolean {
  return hashSecret(providedSecret) === storedSecretHash;
}

// For signing our access tokens consistently
export async function signAccessToken(params: {
  userId: string;
  scope?: string;
}): Promise<string> {
  const signingKey = await getSigningKey();

  return new SignJWT({
    scope: params.scope ?? 'openid',
  })
    .setProtectedHeader({ alg: JWT_ALG, kid: getKeyId() })
    .setIssuer(getTokenIssuer())
    .setAudience(ACCESS_TOKEN_AUDIENCE)
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(signingKey);
}

// For signing an id token (slightly different to above)
export async function signIdToken(params: {
  userId: string;
  clientId: string;
  email: string;
  displayName: string;
  admin: boolean;
}): Promise<string> {
  const signingKey = await getSigningKey();

  return new SignJWT({
    email: params.email,
    name: params.displayName,
    admin: params.admin,
  })
    .setProtectedHeader({ alg: JWT_ALG, kid: getKeyId() })
    .setIssuer(getTokenIssuer())
    .setAudience(params.clientId)
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(ID_TOKEN_EXPIRY)
    .sign(signingKey);
}

// This is used by our API endpoints (/userinfo) to verify an access token
export async function verifyAccessToken(token: string) {
  const verifyKey = await getVerifyKey();

  return jwtVerify(token, verifyKey, {
    issuer: getTokenIssuer(),
    audience: ACCESS_TOKEN_AUDIENCE,
  });
}

// This gets our public JWK information
export async function getPublicJwk() {
  const verifyKey = await getVerifyKey();
  const jwk = await exportJWK(verifyKey);

  return {
    ...jwk,
    alg: JWT_ALG,
    use: 'sig',
    kid: getKeyId(),
  };
}

// This gets our access audience for other functions to use
export function getAccessTokenAudience(): string {
  return ACCESS_TOKEN_AUDIENCE;
}
