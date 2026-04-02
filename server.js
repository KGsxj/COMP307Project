// Load passwords from the .env file
require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json()); 

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const sessionRoutes = require('./routes/studySessions');
app.use('/api/sessions', sessionRoutes);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas!");
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ Error connecting to MongoDB:", error.message);
  });
