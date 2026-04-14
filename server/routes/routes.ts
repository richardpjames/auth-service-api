import express, { type Request, type Response } from 'express';
// Grab the functions from the users controller
import { create as createUser } from '../controllers/userController.js';
import { authorize, login, token } from '../controllers/authController.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Create the router for us to plug in our controllers
const router = express.Router({ mergeParams: true });

// Add the controllers for our users
router.post('/api/users', createUser);
router.post(['/api/login', '/login'], login);
router.get(['/api/authorize', '/authorize'], authorize);
router.post(['/api/token', '/token'], token);

// Get our built client directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../../client/dist');
// This is our static data path as well
router.use(express.static(clientDistPath));

// Serve everything else through react
router.get('/{*splat}', (req: Request, res: Response): void => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
  return;
});

// Export the router for use in the application
export default router;
