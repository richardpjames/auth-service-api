import type { Request, Response } from 'express';
import { getPublicJwk } from '../lib/auth.js';

export function openIdConfiguration(req: Request, res: Response): void {
  if (!process.env.TOKEN_ISSUER) {
    res.status(500).json({ message: 'Missing TOKEN_ISSUER' });
    return;
  }

  const issuer = process.env.TOKEN_ISSUER;

  res.status(200).json({
    issuer,
    authorization_endpoint: `${issuer}/api/authorize`,
    token_endpoint: `${issuer}/api/token`,
    userinfo_endpoint: `${issuer}/api/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    claims_supported: ['sub', 'email', 'name', 'admin'],
  });
}

export async function jwks(req: Request, res: Response): Promise<void> {
  const publicJwk = await getPublicJwk();
  res.status(200).json({
    keys: [publicJwk],
  });
}
