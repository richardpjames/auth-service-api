import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import argon2 from 'argon2';
import { createOpaqueToken, hashSecret } from '../lib/auth.js';
import { Resend } from 'resend';

export async function forgottenPassword(
  req: Request,
  res: Response,
): Promise<void> {
  // Pull the data from the body and we'll validate it as we go
  const { email, suppressEmail } = req.body;
  // These are key for setting our link (maintaining client id etc.)
  const { client_id, redirect_uri, state, scope, returnTo } = req.query as {
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    scope?: string;
    returnTo?: string;
  };
  //We must have an email to process the request
  if (!email) {
    res.status(400).send({ message: 'Email is required.' });
    return;
  }
  // Lets look up the user
  const user = await prisma.user.findUnique({ where: { email } });
  // If there is no user then fail silently - this stops us leaking whether email addresses exist
  if (!user) {
    res.status(200).send({ message: 'Reset email sent.' });
    return;
  }
  // Generate a reset code
  const resetToken = createOpaqueToken();

  // Store it in the database
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashSecret(resetToken),
      userId: user.id,
      // Set expiry in 15 minutes
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  // Check that the API key is set
  if (!process.env.RESEND_API_KEY) {
    res.status(500).send({ message: 'An unexpected error has occurred' });
    return;
  }
  // Create our link for the reset
  const link = new URL(`${process.env.REACT_URL}/resetpassword`);
  // Set ant of our search parameters that we received
  link.searchParams.set('resetToken', resetToken);
  client_id && link.searchParams.set('client_id', client_id);
  redirect_uri && link.searchParams.set('redirect_uri', redirect_uri);
  state && link.searchParams.set('state', state);
  scope && link.searchParams.set('scope', scope);
  returnTo && link.searchParams.set('returnTo', returnTo);

  // Suppress email allows us to test this without sending an email
  if (!suppressEmail) {
    // Create an instance of resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Send the password reset email
    const { data, error } = await resend.emails.send({
      from: 'NoReply <noreply@codingafterhours.dev>',
      to: [user.email],
      template: {
        id: 'password-reset',
        variables: { RESET_LINK: link.toString() },
      },
    });
    // If there is an error returned
    if (error) {
      res.status(500).send({ message: error });
      return;
    }
  }
  // If everything worked then just send a 200
  res.status(200).send({ message: 'Reset email sent.' });
  return;
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  // These are key for setting our link (maintaining client id etc.)
  const { resetToken, password } = req.body;
  // If the token or new password is not provided
  if (!resetToken || !password) {
    res.status(400).send({ message: 'Invalid request.' });
    return;
  }
  // Get the token and user from the database
  const existingResetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashSecret(resetToken) },
    include: { user: true },
  });
  // If there is no token, it's been used, or it's expired
  if (
    !existingResetToken ||
    existingResetToken.expiresAt.getTime() < Date.now() ||
    existingResetToken.usedAt
  ) {
    res.status(400).send({
      message:
        'You have either reset your password already, or your request has expired. Please start again.',
    });
    return;
  }

  const now = new Date();
  // Hash the password
  const passwordHash = await argon2.hash(password);
  // Update the password and mark the token as used together
  await prisma.$transaction([
    prisma.user.update({
      where: { id: existingResetToken.user.id },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: existingResetToken.id },
      data: { usedAt: now },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: existingResetToken.user.id, revokedAt: null },
      data: { revokedAt: new Date(Date.now()) },
    }),
    prisma.authSession.updateMany({
      where: { userId: existingResetToken.user.id },
      data: { expiresAt: new Date(Date.now()) },
    }),
  ]);
  // Return a 200 to the user
  res.status(200).send({ message: 'Password Updated.' });
  return;
}
