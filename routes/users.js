const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the blueprint we just made!

// Route: POST /api/users/register
// Create a brand new user in the database
router.post('/register', async (req, res) => {
  try {
    // Grab user data
    const { name, email, password } = req.body;

    // define whether the user is a student or ta (organizer) by checking their email
    let assignedRole = 'student';

    if (email.endsWith('@mcgill.ca')) {
      assignedRole = 'organizer';
    }

    const newUser = new User({
      name: name,
      email: email,
      password: password,
      role: assignedRole
    })

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

// Route: PUT /api/users/:id/upgrade
// Ugrade a user's role from student to organizer 
// (Can improve this function later to become a request instead of simply clicking the button)
router.put('/:id/upgrade', async(req, res) => {
  try {
    const userId = req.params.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: 'organizer'},
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({
      message: "🎉 You are now an Organizer!",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upgrade user role." });
  }
});


// Route: PUT /api/users/:id/apply
// A student requests to become an organizer
router.put('/:id/apply', async (req, res) => {
  try {
    const userId = req.params.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { applicationStatus: 'pending' },
      { returnDocument: 'after'}
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }
    
    res.status(200).json({
      message: "Application submitted! Please wait for admin approval.",
      status: updatedUser.applicationStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// Route: GET /api/users/applications/pending
// Let an ADMIN see all pending requests
router.get('/applications/pending', async (req, res) => {
  try {
    const pendingUsers = await User.find({ applicationStatus: 'pending' }).select('-password');

    res.status(200).json({
      message: "Here are the pending organizer applications:",
      count: pendingUsers.length,
      users: pendingUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch applications." });
  }
});

// Route: PUT /api/users/:id/approve
// An ADMIN approves a pending request
router.put('/:id/approve', async (req, res) => {
  try {
    const userId = req.params.id;

    const approvedUser = await User.findByIdAndUpdate(
      userId,
      {
        role: 'organizer',
        applicationStatus: 'approved'
      },
      { returnDocument: 'after' }
    );

    if (!approvedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json({ 
      message: "🎉 User has been approved and is now an Organizer!", 
      user: {
        name: approvedUser.name,
        role: approvedUser.role,
        status: approvedUser.applicationStatus
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to approve user." });
  }
});


// Route: POST /api/users/login
// Verify a user's credentials so they can access the app
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // check in db
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(404).json({ error: "User not found. Please check your email." });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Incorrect password." });
    }

    res.status(200).json({ 
      message: "✅ Login successful!", 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong during login." });
  }
});

module.exports = router;