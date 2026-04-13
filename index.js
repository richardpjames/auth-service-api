import express from "express";
// Read configuration from .env files
import "dotenv/config";

// Initialise the express app
const app = express();

app.get("/", (req, res) => {
  res.send("Hello World");
});

// Determine the port to use based on environment variables
const port = process.env.PORT || 3000;
// Start the application
app.listen(port);
console.log(`Application started on port ${port}`);
