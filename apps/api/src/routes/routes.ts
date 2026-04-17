import express, { type Request, type Response } from 'express';
// Grab the functions from the users controller
import {
  createUser as createUser,
  getAllUsers,
  me,
} from '../controllers/userController.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  createClientApp,
  deleteClientApp,
  getAllClientApps,
} from '../controllers/clientAppController.js';
import { jwks, openIdConfiguration } from '../controllers/openIdController.js';
import { login, logout } from '../controllers/sessionController.js';
import { authorize, token } from '../controllers/oauthController.js';
import { userinfo } from '../controllers/userInfoController.js';
import {
  forgottenPassword,
  resetPassword,
} from '../controllers/passwordController.js';

// Create the router for us to plug in our controllers
const router = express.Router({ mergeParams: true });

// Add the controllers for our users
router.post('/api/users', createUser);
router.get('/api/users', requireAuth, requireAdmin, getAllUsers);
router.get(['/api/me', '/me'], requireAuth, me);
// Add the controllers for client apps
router.get('/api/clientapps', requireAuth, requireAdmin, getAllClientApps);
router.post('/api/clientapps', requireAuth, requireAdmin, createClientApp);
router.delete(
  '/api/clientapps/:id',
  requireAuth,
  requireAdmin,
  deleteClientApp,
);
// Add our auth controllers
router.post(['/api/login', '/login'], login);
router.get(['/api/authorize', '/authorize'], authorize);
router.post(['/api/token', '/token'], token);
router.post(['/api/logout', '/logout'], requireAuth, logout);
router.get(['/api/userinfo', '/userinfo'], userinfo);
router.post(['/api/forgottenpassword'], forgottenPassword);
router.post(['/api/resetpassword'], resetPassword);

router.get('/.well-known/openid-configuration', openIdConfiguration);
router.get('/.well-known/jwks.json', jwks);

// Get our built client directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../../../web/dist');
// This is our static data path as well
router.use(express.static(clientDistPath));

// Serve everything else through react
router.get('/{*splat}', (req: Request, res: Response): void => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
  return;
});

// Export the router for use in the application
export default router;
