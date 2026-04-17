import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { verifyAccessToken } from '../lib/auth.js';

export async function userinfo(req: Request, res: Response): Promise<void> {
  // Take the bearer token from the header
  const authorization = req.header('authorization');

  // If one is not present then send a message back
  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing bearer token' });
    return;
  }

  // Trim the token from the wider header
  const accessToken = authorization.slice('Bearer '.length).trim();

  // Try and decode the the token and send the user if we can
  try {
    const { payload } = await verifyAccessToken(accessToken);
    // Otherwise get the user from the session key
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        admin: true,
        createdAt: true,
        updatedAt: true,
        disabledAt: true,
      },
    });
    // If we can't find the user then there is an issue with the access token
    if (!user) {
      res.status(401).json({ message: 'Invalid or expired access token' });
      return;
    }
    // If the user account is disabled
    if (user.disabledAt) {
      res.status(401).json({ message: 'This account has been disabled' });
      return;
    }
    // Otherwise send the user back in OIDC style
    res.status(200).json({
      sub: user.id,
      name: user.displayName,
      email: user.email,
      email_verified: false,
    });
    // If it could not be decoded then send back an error
  } catch {
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
}
