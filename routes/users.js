const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the blueprint we just made!

// Route: POST /api/users/register
// Purpose: Create a brand new user in the database
router.post('/register', async (req, res) => {
  try {
    // Grab the data the customer sent us in their request
    const { name, email, password, role } = req.body;

    // Create a new user object 
    const newUser = new User({
      name: name,
      email: email,
      password: password, 
      role: role
    });

    // Save that new user to database
    const savedUser = await newUser.save();

    // Send a success message (and the saved data) back to the customer
    res.status(201).json({ 
        message: "✅ User created successfully!", 
        user: savedUser 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user", details: error.message });
  }
});

module.exports = router;