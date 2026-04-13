// Start with using express for our web server
import express from 'express';
import type { Request, Response } from 'express';
// Read configuration from .env files
import 'dotenv/config';
// Helmet is used to secure the application
import helmet from 'helmet';

// Get our routes
import router from './routes/routes.js';

// Initialise the express app
const app = express();
// Add helmet
app.use(helmet());
// Allow the ingestion of json
app.use(express.json());

// Add our application routes
app.use(router);

// Add a simple health route
app.get('/api/health', (req: Request, res: Response): void => {
  res.send().status(200);
});

// Determine the port to use based on environment variables
const port = Number(process.env.PORT) || 3000;
// Start the application
app.listen(port, () => {
  console.log(`Application started on port ${port}`);
});
