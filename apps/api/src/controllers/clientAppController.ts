import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';
import { hashSecret } from '../lib/auth.js';

// Describe the valid format for a client app on creation
const createClientAppSchema = z.object({
  name: z.string().min(1, 'Please provide a name'),
  clientId: z.string().min(1, 'Please provide a client id'),
  clientSecret: z.string().min(1, 'Please provide a client secret'),
  redirectUri: z.url('Please provide a valid Redirect URI'),
});

export async function createClientApp(
  req: Request,
  res: Response,
): Promise<void> {
  // Check for a valid request
  const parsedBody = createClientAppSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: 'Please check your inputs and try again',
      errors: z.flattenError(parsedBody.error).fieldErrors,
    });
    return;
  }

  // Pull the data we need from the parsed body
  const { name, clientId, clientSecret, redirectUri } = parsedBody.data;

  // Check whether there is an existing client app in the database
  const existingClientApp = await prisma.clientApp.findUnique({
    where: { clientId: clientId.toLowerCase() },
  });

  // If there is then return an error message to the user
  if (existingClientApp) {
    res.status(409).json({
      message: 'A client app with that client ID already exists',
    });
    return;
  }

  // If not - then create the client app in the database
  const clientApp = await prisma.clientApp.create({
    data: {
      clientId: clientId.toLowerCase(),
      name,
      clientSecret: hashSecret(clientSecret),
      redirectUri,
    },
    // Get the data back
    select: {
      id: true,
      name: true,
      clientId: true,
      clientSecret: false,
      redirectUri: true,
    },
  });

  res
    .status(201)
    .json({ message: 'Client App created succesfully', clientApp });
}

export async function getAllClientApps(
  req: Request,
  res: Response,
): Promise<void> {
  // This is sat behind middleware which restricts to admin users, so we can just return everything
  const clients = await prisma.clientApp.findMany({
    select: {
      name: true,
      clientId: true,
      redirectUri: true,
      clientSecret: false,
    },
  });
  // Now return the users
  res.status(200).json(clients);
  return;
}

export async function deleteClientApp(req: Request, res: Response) {
  // Get the id from the parameters as a string
  const { id } = req.params as { id?: string };

  // If there is no id provided then erorr
  if (!id) {
    res.status(400).json({ message: 'Client app id is required' });
    return;
  }

  // Check if there is a client app to delete
  const existingClientApp = await prisma.clientApp.findUnique({
    where: { id },
  });

  // If not then provide an error message
  if (!existingClientApp) {
    res.status(404).json({ message: 'Client app not found' });
    return;
  }

  // Delete the client app
  await prisma.clientApp.delete({
    where: { id },
  });

  // Give a response to confirm
  res.status(200).json({
    message: 'Client app deleted successfully',
  });
}
