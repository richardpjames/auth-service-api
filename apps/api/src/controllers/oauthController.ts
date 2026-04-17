import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import crypto from 'node:crypto';
import {
  createOpaqueToken,
  createPkceCodeChallenge,
  hashToken,
  signAccessToken,
  signIdToken,
  verifySecret,
} from '../lib/auth.js';

export async function authorize(req: Request, res: Response) {
  // Get all of the parameters we need from the query string as strings
  const {
    client_id,
    redirect_uri,
    state,
    response_type,
    scope,
    code_challenge,
    code_challenge_method,
  } = req.query as {
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    response_type?: string;
    scope?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  };

  // We only support the code response type in this application
  if (response_type !== 'code') {
    return res
      .status(400)
      .send({ message: 'Only response_type=code is supported' });
  }
  // Check that a scope has been provided which includes openid
  if (!scope || !String(scope).split(' ').includes('openid')) {
    return res.status(400).send({ message: 'Missing openid scope' });
  }

  // Make sure required OAuth params are present
  if (!client_id || !redirect_uri) {
    res.status(400).send({ message: 'Missing client_id or redirect_uri' });
    return;
  }

  // Get the client from the database
  const client = await prisma.clientApp.findUnique({
    where: { clientId: client_id },
  });

  // And check that it exists with a matching return uri
  if (!client || client.redirectUri !== redirect_uri) {
    return res.status(400).send({ message: 'Invalid client' });
  }

  // Check if the client is public and has provided a valid code challenge (and method)
  if (client.isPublic) {
    if (!code_challenge || code_challenge_method !== 'S256') {
      return res
        .status(400)
        .send({ message: 'PKCE is required for public clients' });
    }
  }
  var session = null;
  // Get the session key from the users cookie and look it up from the database
  const sessionKey = req.cookies.auth_sessionId;
  // No lookup if the key is not present
  if (sessionKey) {
    session = await prisma.authSession.findUnique({
      where: { sessionKey },
      include: { user: true },
    });
  }

  // If there is no session, or that session has expired then redirect to the login page
  if (!session || session.expiresAt.getTime() < Date.now()) {
    const loginUrl = new URL(`${process.env.REACT_URL}/login`);
    loginUrl.searchParams.set('client_id', client_id);
    loginUrl.searchParams.set('redirect_uri', redirect_uri);
    loginUrl.searchParams.set('response_type', 'code');
    loginUrl.searchParams.set('scope', scope);
    if (state) loginUrl.searchParams.set('state', state);
    return res.redirect(loginUrl.toString());
  }

  // Check the user is not disabled
  if (session.user.disabledAt) {
    res.status(400).send({ message: 'This account is disabled' });
    return;
  }

  // Otherwise we create an auth code...
  const code = await prisma.authCode.create({
    data: {
      code: crypto.randomBytes(24).toString('hex'),
      userId: session.userId,
      clientAppId: client.id,
      // Create a date/time 5 minutes from now
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      codeChallenge: code_challenge ?? null,
      codeChallengeMethod: code_challenge_method ?? null,
    },
  });

  // and redirect to the application
  const redirect = new URL(redirect_uri);
  // with the code and stat if it exists
  redirect.searchParams.set('code', code.code);
  state && redirect.searchParams.set('state', state);

  // Perform the redirect
  res.redirect(redirect.toString());
}

export async function token(req: Request, res: Response): Promise<void> {
  const {
    grant_type,
    code,
    client_id,
    client_secret,
    redirect_uri,
    refresh_token,
    code_verifier,
  } = req.body;

  if (grant_type !== 'authorization_code' && grant_type !== 'refresh_token') {
    res.status(400).json({ message: 'Unsupported Grant Type' });
    return;
  }

  // This route to retreive tokens with an authorization code
  if (grant_type === 'authorization_code') {
    // Find the client from the request
    const client = await prisma.clientApp.findUnique({
      where: { clientId: client_id },
    });

    // If there was no client, or the secret and uri don't match up
    if (!client || client.redirectUri !== redirect_uri) {
      res.status(401).json({ message: 'Invalid Client' });
      return;
    }

    // For clients with a secret, check that it exists and is valid
    if (
      !client.isPublic &&
      !verifySecret(client_secret, client.clientSecret!)
    ) {
      res.status(401).json({ message: 'Invalid Client' });
      return;
    }

    // Next get the auth code so that we can check
    const authCode = await prisma.authCode.findUnique({
      where: { code },
      include: {
        user: true,
        clientApp: true,
      },
    });

    // Make checks that the code exists, has not yet been used, has not expired and belongs to the right client
    if (
      !authCode ||
      authCode.usedAt ||
      authCode.expiresAt.getTime() < Date.now() ||
      authCode.clientApp.clientId !== client_id
    ) {
      res.status(400).json({ message: 'Invalid Grant' });
      return;
    }

    // If there is a code challenge stored against the auth code, then we must verify it
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        res.status(400).json({ message: 'Missing code_verifier' });
        return;
      }

      if (authCode.codeChallengeMethod !== 'S256') {
        res.status(400).json({ message: 'Unsupported code challenge method' });
        return;
      }

      // Calculate the hash from the verifier (should match the original challenge)
      const calculatedChallenge = createPkceCodeChallenge(code_verifier);

      if (calculatedChallenge !== authCode.codeChallenge) {
        res.status(400).json({ message: 'Invalid code_verifier' });
        return;
      }
    }

    // Update the auth code so that we know it has expired
    await prisma.authCode.update({
      where: { id: authCode.id },
      data: { usedAt: new Date() },
    });

    const accessToken = await signAccessToken({
      userId: authCode.user.id,
      scope: 'openid',
    });

    const idToken = await signIdToken({
      userId: authCode.user.id,
      clientId: client_id,
      email: authCode.user.email,
      displayName: authCode.user.displayName,
      admin: authCode.user.admin,
    });

    // Generate a random token
    const refreshToken = createOpaqueToken();
    const refreshTokenHash = hashToken(refreshToken);

    // Store it in the database
    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        userId: authCode.user.id,
        clientAppId: client.id,
        // This adds 30 das
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Return the access, id and refresh tokens to the requester
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
      id_token: idToken,
      refresh_token: refreshToken,
    });
  }

  // This route for refresh tokens
  if (grant_type === 'refresh_token') {
    // Get the client so that we can validate their secret
    const client = await prisma.clientApp.findUnique({
      where: { clientId: client_id },
    });

    // If there is no client specified and the secret is missing then send a message
    if (!client) {
      res.status(401).json({ message: 'Invalid Client' });
      return;
    }

    // For clients with a secret, check that it exists and is valid
    if (
      !client.isPublic &&
      !verifySecret(client_secret, client.clientSecret!)
    ) {
      res.status(401).json({ message: 'Invalid Client' });
      return;
    }

    // Generate a new refresh token and calculate an expiry date in 30 days
    const rotatedRefreshToken = createOpaqueToken();
    const rotatedRefreshTokenHash = hashToken(rotatedRefreshToken);
    const now = new Date();
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Generate the hash for the provided token
    const refreshTokenHash = hashToken(refresh_token);

    // Wrap our prisma work inside a transaction so that all logic is executed togehter
    const storedRefreshToken = await prisma.$transaction(async (tx) => {
      // tx is the transaction - we'll first find the existing token
      const existingRefreshToken = await tx.refreshToken.findUnique({
        where: { tokenHash: refreshTokenHash },
        include: {
          user: true,
          clientApp: true,
        },
      });

      // If it doesn't exist, or it's been used, revoked or expired - or it doesn't belong to this client then return
      if (
        !existingRefreshToken ||
        existingRefreshToken.usedAt ||
        existingRefreshToken.revokedAt ||
        existingRefreshToken.expiresAt.getTime() < now.getTime() ||
        existingRefreshToken.clientApp.clientId !== client_id
      ) {
        return null;
      }

      // If the user account has been disabled
      if (existingRefreshToken.user.disabledAt) {
        return null;
      }

      // Now update that token to say that it has been consumed
      const consumeResult = await tx.refreshToken.updateMany({
        where: {
          id: existingRefreshToken.id,
          usedAt: null,
          revokedAt: null,
        },
        data: { usedAt: now },
      });

      // Check for if the update happened or return
      if (consumeResult.count !== 1) {
        return null;
      }

      // Then create the new refresh token
      await tx.refreshToken.create({
        data: {
          tokenHash: rotatedRefreshTokenHash,
          userId: existingRefreshToken.user.id,
          clientAppId: existingRefreshToken.clientApp.id,
          expiresAt: refreshTokenExpiry,
        },
      });

      // If all of that worked then return the existng refresh token
      return existingRefreshToken;
    });

    // If there was no stored token then we didn't create a new one, but the request was invalid
    if (!storedRefreshToken) {
      res.status(400).json({ message: 'Invalid Refresh Token' });
      return;
    }

    // Create a new access token
    const accessToken = await signAccessToken({
      userId: storedRefreshToken.user.id,
      scope: 'openid',
    });

    // Create a new id token
    const idToken = await signIdToken({
      userId: storedRefreshToken.user.id,
      clientId: client_id,
      email: storedRefreshToken.user.email,
      displayName: storedRefreshToken.user.displayName,
      admin: storedRefreshToken.user.admin,
    });

    // Send back all of the tokens
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: rotatedRefreshToken,
      id_token: idToken,
    });
    return;
  }
}
