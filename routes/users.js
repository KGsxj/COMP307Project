const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the blueprint we just made!

// Route: POST /api/users/register
// Create a brand new user in the database
router.post('/register', async (req, res) => {
 try {
    const { name, email, password } = req.body;

    if (!email.endsWith("mail.mcgill.ca") && !email.endsWith("mcgill.ca")) {
      return res.status(400).json({ error: "Please enter a valid mcgill email." });
    }

    // EVERYONE defaults to a student. TAs must apply via the /apply route.
    const newUser = new User({
      name: name,
      email: email,
      password: password,
      role: 'student' 
    });

    const savedUser = await newUser.save();

    res.status(201).json({ 
        message: "✅ User created successfully!", 
        user: savedUser 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user", details: error.message });
  }
});

// Route: PUT /api/users/:id/apply
// A student submit an application with a self-reported GPA for admin review
router.put('/:id/apply', async (req, res) => {
  try {
    const userId = req.params.id;
    const { course, gpa } = req.body

    if (!course || gpa === undefined) {
        return res.status(400).json({ error: "Both course and gpa are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const existingRole = user.courseRoles.find(r => r.course === course);
    
    if (existingRole) {
        if (existingRole.status === 'approved') {
            return res.status(400).json({ error: `You are already an organizer for ${course}.` });
        }
        if (existingRole.status === 'pending') {
            return res.status(400).json({ error: `You already have a pending application for ${course}.` });
        }
        // If it was 'rejected', we allow them to re-apply and update the GPA/status
        existingRole.status = 'pending';
        existingRole.gpa = Number(gpa);
    } else {
        // If no existing application for this course, push a brand new one
        user.courseRoles.push({
            course: course,
            gpa: Number(gpa),
            status: 'pending'
        });
    }

    await user.save();

    res.status(200).json({ 
      message: `Application submitted for ${course}!`, 
      courseRoles: user.courseRoles 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit application." });
  }
});

// Route: GET /api/users/applications/pending
// Let an ADMIN see all pending requests
router.get('/applications/pending', async (req, res) => {
  try {
    // Search inside the array for the pending status
    const pendingUsers = await User.find({
      'courseRoles.status': 'pending'
    }).select('name email courseRoles'); // Only send necessary fields to keep it fast

    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch pending applications." });
  }
});

// Route: PUT /api/users/:id/approve
// An ADMIN approves a specific course for a user
router.put('/:id/approve/:course', async (req, res) => {
  try {
    const { id, course } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the exact course in their array
    const roleIndex = user.courseRoles.findIndex(r => r.course === course);
    
    if (roleIndex === -1) {
      return res.status(404).json({ error: `Application for ${course} not found.` });
    }

    // Change the status of that specific course
    user.courseRoles[roleIndex].status = 'approved';

    // The "VIP Pass" Upgrade: If they are a standard student, make them an Organizer globally
    // so the frontend knows to show them the Organizer dashboards.
    if (user.role === 'student') {
      user.role = 'organizer';
    }

    await user.save();

    res.status(200).json({ 
      message: `User is now an approved Organizer for ${course}!`, 
      courseRoles: user.courseRoles 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to approve user." });
  }
});

// Route: PUT /api/users/:id/decline/:course
// Admin rejects a specific course application
router.put('/:id/decline/:course', async (req, res) => {
  try {
    const { id, course } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the exact course in their array
    const roleIndex = user.courseRoles.findIndex(r => r.course === course);
    
    if (roleIndex === -1) {
      return res.status(404).json({ error: `Application for ${course} not found.` });
    }

    // Change the status of that specific course to rejected
    user.courseRoles[roleIndex].status = 'rejected';

    await user.save();

    res.status(200).json({ 
      message: `Application for ${course} has been declined.`, 
      courseRoles: user.courseRoles 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to decline user." });
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