// Load passwords from the .env file
require('dotenv').config(); 

const User = require('./models/User');
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

// creating admin role 
async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log("⚠️ Admin credentials not found in .env. Skipping admin seed.");
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("✅ System Admin already exists. No action needed.");
      return;
    }

    const newAdmin = new User({
      name: "System Admin",
      email: adminEmail,
      password: adminPassword, 
      role: 'admin'
    });

    await newAdmin.save();
    console.log("🎉 System Admin seeded successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  }
}

// Connect to MongoDB Atlas
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas!");
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      seedAdmin();
    });
  })
  .catch((error) => {
    console.error("❌ Error connecting to MongoDB:", error.message);
  });
