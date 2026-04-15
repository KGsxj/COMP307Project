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
    const { course, gpa, taCode } = req.body

    if (!course) {
        return res.status(400).json({ error: "Course is required." });
    }

    // If they don't have the secret code, they must provide a GPA
    if (!taCode && gpa === undefined) {
        return res.status(400).json({ error: "GPA is required for student applications." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    let initialStatus = 'pending';
    let finalGpa;

    if (taCode) {
        // 1. If they try to use a code, it MUST be correct
        if (taCode !== "mcgill-ta-2026") {
            return res.status(403).json({ error: "Invalid TA Access Code." });
        }
        // 2. It is correct! Give them the VIP Pass.
        initialStatus = 'approved';
        user.role = 'organizer';
        finalGpa = 4.0; // Completely ignore whatever they typed in the GPA field
    } else {
        // No code provided, so they are a student. They MUST have a GPA.
        if (gpa === undefined || gpa === null || gpa === "") {
            return res.status(400).json({ error: "GPA is required for student applications." });
        }
        // Ensure what they typed is actually a number
        finalGpa = Number(gpa);
        if (isNaN(finalGpa)) {
            return res.status(400).json({ error: "GPA must be a valid number." });
        }
    }

    const existingRole = user.courseRoles.find(r => r.course === course);
    
    if (existingRole) {
        if (existingRole.status === 'approved') {
            return res.status(400).json({ error: `You are already an organizer for ${course}.` });
        }
        if (existingRole.status === 'pending') {
            return res.status(400).json({ error: `You already have a pending application for ${course}.` });
        }
        
        // Update existing rejected application
        existingRole.status = initialStatus;
        existingRole.gpa = finalGpa;
    } else {
        // Push brand new application
        user.courseRoles.push({
            course: course,
            gpa: finalGpa,
            status: initialStatus
        });
    }

    await user.save();

    res.status(200).json({ 
      message: initialStatus === 'approved' 
        ? `TA Access granted! You are now an Organizer for ${course}.`
        : `Application submitted for ${course}!`, 
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

// Route: GET /api/users/tutors/:course
// Fetch all approved organizers for a specific course
router.get('/tutors/:course', async (req, res) => {
  try {
    const course = req.params.course;

    const tutors = await User.find({
      $or: [{ role: 'organizer' }, { role: 'admin' }],
      courseRoles: {
        $elemMatch: { course: course, status: 'approved' }
      }
    }).select('name email'); // Only send back safe info

    res.status(200).json(tutors);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tutors." });
  }
});

// Route: POST /api/users/request-tutor
// Send a tutor request and save the message in the database
router.post('/request-tutor', async (req, res) => {
  try {
    const { studentId, tutorId, course, message } = req.body;

    if (!studentId || !tutorId || !course) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const student = await User.findById(studentId);
    const tutor = await User.findById(tutorId);

    if (!student || !tutor) {
      return res.status(404).json({ error: "User not found." });
    }

    // SAVE TO DATABASE 
    student.tutorRequests.push({
        course: course,
        requestedTutor: tutorId,
        message: message || "No message provided."
    });
    await student.save();

    res.status(200).json({ 
      message: `Successfully sent your request to ${tutor.name}!`,
      requests: student.tutorRequests 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send tutor request." });
  }
});

module.exports = router;