// Read configuration from .env files
import 'dotenv/config';
import { createApp } from './app.js';

// Create our application
const app = createApp();
// Determine the port to use based on environment variables
const port = Number(process.env.PORT) || 3000;
// Start the application
app.listen(port, () => {
  console.log(`Application started on port ${port}`);
});
