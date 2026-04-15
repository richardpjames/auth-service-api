// Start with using express for our web server
import express, { type Request, type Response, type Express } from 'express';
import cookieParser from 'cookie-parser';
// Helmet is used to secure the application
import helmet from 'helmet';
// Get our routes
import router from './routes/routes.js';

export function createApp(): Express {
  // Initialise the express app
  const app = express();
  // Add helmet
  app.use(helmet());
  // Allow the ingestion of json
  app.use(express.json());
  // Allow working with cookies
  app.use(cookieParser());

  // Add our application routes
  app.use(router);

  // Add a simple health route
  app.get('/api/health', (req: Request, res: Response): void => {
    res.send().status(200);
  });

  return app;
}
