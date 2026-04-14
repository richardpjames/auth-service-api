import argon2 from 'argon2';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';

// Describe the valid format for a user on creation
const createUserSchema = z.object({
  email: z.email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Your password must be at least 8 characters long'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Your display name is required')
    .max(100, 'Your display name must be 100 characters or fewer'),
});

// Create the type from the z schema above
type CreateUserBody = z.infer<typeof createUserSchema>;

export async function create(
  req: Request<{}, {}, CreateUserBody>,
  res: Response,
): Promise<void> {
  const parsedBody = createUserSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: 'Please check your inputs and try again',
      errors: z.flattenError(parsedBody.error).fieldErrors,
    });
    return;
  }

  // Pull the data we need from the parsed body
  const { email, password, displayName } = parsedBody.data;

  // Check whether there is an existing user in the database
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  // If there is then return an error message to the user
  if (existingUser) {
    res.status(409).json({
      message: 'A user with that email already exists',
    });
    return;
  }

  // If not then we can insert the user, so we hash the password
  const passwordHash = await argon2.hash(password);

  // Creates the user in the databse and returns the users basic details
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
    },
    // Just return the id, email and confirmation of the created time
    select: {
      id: true,
      email: true,
      displayName: true,
      createdAt: true,
    },
  });

  // Return a success message with a copy of the user object
  res.status(201).json({
    message: 'User created successfully',
    user,
  });
}
