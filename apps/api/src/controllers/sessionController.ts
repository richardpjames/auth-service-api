import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { sanitizeReturnTo } from '../lib/url.js';

export async function login(req: Request, res: Response): Promise<void> {
  // This function is simpler than some of the others, so using a z schema is overkill
  // Pull the data from the body and we'll validate it as we go
  const {
    email,
    password,
    client_id,
    redirect_uri,
    state,
    returnTo,
    code_challenge,
    code_challenge_method,
  } = req.body;
  // See if we have the user in our database
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  // If not then give a generic error message
  if (!user) {
    res.status(400).send({ message: 'Incorrect Username or Password.' });
    return;
  }
  // Check if the user account is disabled
  if (user.disabledAt) {
    res.status(400).send({ message: 'This account has been disabled.' });
    return;
  }
  // If we have a user then check the password
  const passwordOk = await argon2.verify(user.passwordHash, password);
  // If that's not okay then give the same error message
  if (!passwordOk) {
    res.status(400).send({ message: 'Incorrect Username or Password.' });
    return;
  }
  // If the username and password are okay then we can create a session
  const authSession = await prisma.authSession.create({
    data: {
      sessionKey: crypto.randomBytes(24).toString('hex'),
      userId: user.id,
      // Create a date 7 days in the future
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  // Now add that to a cookie
  res.cookie('auth_sessionId', authSession.sessionKey, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Set this to secure if we are in the production environment
    secure: process.env.NODE_ENV === 'production',
  });
  // If we have come here from another application then we need to generate a code
  if (client_id && redirect_uri) {
    // Get the client from the database
    const client = await prisma.clientApp.findUnique({
      where: { clientId: client_id },
    });
    // Check the redirect uri (and whether we have a client)
    if (!client || client.redirectUri !== redirect_uri) {
      res.status(400).send({ message: 'Invalid Client.' });
      return;
    }
    if (client.isPublic) {
      if (!code_challenge || code_challenge_method !== 'S256') {
        res
          .status(400)
          .send({ message: 'PKCE is required for public clients' });
        return;
      }
    }
    // If that is all correct then generate a code
    const code = await prisma.authCode.create({
      data: {
        code: crypto.randomBytes(24).toString('hex'),
        userId: user.id,
        clientAppId: client.id,
        // Create a date 5 minutes in the future
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        codeChallenge: code_challenge ?? null,
        codeChallengeMethod: code_challenge_method ?? null,
      },
    });
    // Redirect the user back to the requesting application
    const url = new URL(redirect_uri);
    // Set the newly generated code
    url.searchParams.set('code', code.code);
    // Add the state if there is one
    state && url.searchParams.set('state', state);
    // Then redirect
    res.status(200).send({ redirectTo: url.toString() });
    return;
  }

  // If there is no client, then we redirect to either the returnTo URL, the admin page, or back to the blog
  let redirectTo = 'https://www.richardpjames.com';
  if (!returnTo && user.admin) {
    redirectTo = `${process.env.REACT_URL}/admin`;
  }
  // If we have a returnTo parameter passed (from react) then we go back to that URL
  if (returnTo) {
    const safeReturnTo = sanitizeReturnTo(
      returnTo,
      user.admin ? '/admin' : '/',
    );
    redirectTo = new URL(safeReturnTo, process.env.REACT_URL).toString();
  }
  // Return a success message and a simple redirect
  res.status(200).send({
    message: 'Logged In.',
    redirectTo,
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  // Get the session key from the cookie
  const sessionKey = req.cookies.auth_sessionId;

  // If one is set (the user is loggged in) then delete the session
  if (sessionKey) {
    await prisma.authSession.deleteMany({
      where: {
        sessionKey,
      },
    });
  }

  // Clear the users cookie
  res.clearCookie('auth_sessionId', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  // Revoke any refresh tokens
  await prisma.refreshToken.updateMany({
    where: {
      // Because of the requireAuth middleware this will be set
      userId: req.user!.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  // Respond to the client
  res.status(200).json({
    message: 'Logged out successfully',
  });
}
