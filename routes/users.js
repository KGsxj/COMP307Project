const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the blueprint we just made!

function legacyPreferredDateFromMessage(message) {
  if (!message) return '';
  const match = message.match(/Preferred date:\s*([^\n\r]+)/i);
  return match ? match[1].trim() : '';
}

function legacyPreferredTimeFromMessage(message) {
  if (!message) return '';
  const match = message.match(/Preferred time:\s*([^\n\r]+)/i);
  return match ? match[1].trim() : '';
}

function legacyPlainMessageFromCombined(message) {
  if (!message) return '';
  const match = message.match(/Message:\s*([\s\S]*)/i);
  return match ? match[1].trim() : message.trim();
}

function hasStructuredTutorTimes(reqDoc) {
  return !!(reqDoc.preferredDate && reqDoc.preferredTimeStart && reqDoc.preferredTimeEnd);
}

function resolveTutorRequestDisplay(reqDoc) {
  let preferredDate = (reqDoc.preferredDate || '').trim();
  let preferredTime = '';
  if (reqDoc.preferredTimeStart && reqDoc.preferredTimeEnd) {
    preferredTime = `${reqDoc.preferredTimeStart}-${reqDoc.preferredTimeEnd}`;
  }
  let studentMessage = (reqDoc.message || '').trim();

  if (!hasStructuredTutorTimes(reqDoc) && reqDoc.message) {
    const ld = legacyPreferredDateFromMessage(reqDoc.message);
    const lt = legacyPreferredTimeFromMessage(reqDoc.message);
    if (ld || lt) {
      preferredDate = ld || preferredDate;
      preferredTime = lt || preferredTime;
      studentMessage = legacyPlainMessageFromCombined(reqDoc.message);
    }
  }

  if (!preferredDate) preferredDate = '—';
  if (!preferredTime) preferredTime = '—';
  if (!studentMessage) studentMessage = '—';

  return { preferredDate, preferredTime, studentMessage };
}

function validateCalendarDateYyyyMmDd(value) {
  if (!value || typeof value !== 'string') return 'Date is required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'Date must use a four-digit year (YYYY-MM-DD).';
  }
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  ) {
    return 'That calendar date is not valid.';
  }
  return '';
}

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

// Route: PUT /api/users/reset-password
// Reset password
router.put('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required." });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.password = newPassword;
    
    await user.save();

    res.status(200).json({ message: "Password successfully updated! You can now log in." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to reset password." });
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
    const {
      studentId,
      tutorId,
      course,
      message,
      preferredDate,
      preferredStartTime,
      preferredEndTime
    } = req.body;

    if (!studentId || !tutorId || !course) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const dateErr = validateCalendarDateYyyyMmDd(preferredDate);
    if (dateErr) {
      return res.status(400).json({ error: dateErr });
    }
    if (!preferredStartTime || !preferredEndTime) {
      return res.status(400).json({ error: "Preferred start and end time are required." });
    }

    const student = await User.findById(studentId);
    const tutor = await User.findById(tutorId);

    if (!student || !tutor) {
      return res.status(404).json({ error: "User not found." });
    }

    // Block only an open (pending) request for the same tutor and course — not accepted/declined
    const alreadyRequested = student.tutorRequests.some(
      (request) =>
        request.requestedTutor.toString() === tutorId &&
        request.course === course &&
        request.status === 'pending'
    );

    if (alreadyRequested) {
      return res.status(400).json({
        error: `You already have a pending request with ${tutor.name} for ${course}.`
      });
    }

    const plainMessage = typeof message === 'string' ? message.trim() : '';

    student.tutorRequests.push({
      course: course,
      requestedTutor: tutorId,
      message: plainMessage,
      preferredDate: preferredDate.trim(),
      preferredTimeStart: String(preferredStartTime).trim(),
      preferredTimeEnd: String(preferredEndTime).trim(),
      status: 'pending'
    });
    await student.save();

    const added = student.tutorRequests[student.tutorRequests.length - 1];

    res.status(200).json({
      message: `Successfully sent your request to ${tutor.name}!`,
      requestId: added._id,
      requests: student.tutorRequests
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send tutor request." });
  }
});

// Route: GET /api/users/tutor-requests/:tutorId
// Pending and accepted requests for this tutor (declined/cancelled omitted)
router.get('/tutor-requests/:tutorId', async (req, res) => {
  try {
    const tutorId = req.params.tutorId;

    const students = await User.find(
      {
        tutorRequests: {
          $elemMatch: {
            requestedTutor: tutorId,
            status: { $in: ['pending', 'accepted'] }
          }
        }
      },
      'name email tutorRequests'
    );

    let tutorRequests = [];
    students.forEach((student) => {
      student.tutorRequests.forEach((request) => {
        if (
          request.requestedTutor.toString() === tutorId &&
          (request.status === 'pending' || request.status === 'accepted')
        ) {
          const disp = resolveTutorRequestDisplay(request);
          tutorRequests.push({
            studentId: student._id,
            studentName: student.name,
            studentEmail: student.email,
            requestId: request._id,
            course: request.course,
            preferredDate: disp.preferredDate,
            preferredTime: disp.preferredTime,
            studentMessage: disp.studentMessage,
            status: request.status,
            createdAt: request.createdAt
          });
        }
      });
    });

    tutorRequests.sort((a, b) => {
      const rank = (s) => (s === 'pending' ? 0 : 1);
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json(tutorRequests);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tutor requests." });
  }
});

// Route: PUT /api/users/tutor-requests/:studentId/:requestId
// Allows the TA to accept or decline a request
router.put('/tutor-requests/:studentId/:requestId', async (req, res) => {
  try {
    const { studentId, requestId } = req.params;
    const { action } = req.body; // Frontend will send {"action": "accepted"} or {"action": "declined"}

    if (action !== 'accepted' && action !== 'declined') {
      return res.status(400).json({ error: "Action must be 'accepted' or 'declined'." });
    }

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found." });

    // Find the specific request inside the student's array
    const request = student.tutorRequests.id(requestId);
    if (!request) return res.status(404).json({ error: "Request not found." });

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "This request is no longer pending." });
    }

    // Update the status and save
    request.status = action;
    await student.save();

    res.status(200).json({ message: `Request successfully ${action}!` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update request." });
  }
});

// Route: GET /api/users/my-tutor-requests/:studentId
// Fetch all tutor requests made BY a specific student
router.get('/my-tutor-requests/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Find the student and POPULATE the tutor's name and email
    const student = await User.findById(studentId)
      .populate('tutorRequests.requestedTutor', 'name email');

    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Format the data cleanly
    const formattedRequests = student.tutorRequests.map((request) => {
      const disp = resolveTutorRequestDisplay(request);
      return {
        requestId: request._id,
        tutorName: request.requestedTutor ? request.requestedTutor.name : 'Unknown Tutor',
        course: request.course,
        message: request.message,
        preferredDate: disp.preferredDate,
        preferredTime: disp.preferredTime,
        studentMessage: disp.studentMessage,
        status: request.status,
        createdAt: request.createdAt
      };
    });

    // Sort from the newest to oldest
    formattedRequests.sort((a, b) => b.createdAt - a.createdAt);

    res.status(200).json(formattedRequests);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch your tutor requests." });
  }
});

// Route: DELETE /api/users/my-tutor-requests/:studentId/:requestId
// Student withdraws a pending tutor request (organizers no longer see it)
router.delete('/my-tutor-requests/:studentId/:requestId', async (req, res) => {
  try {
    const { studentId, requestId } = req.params;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "User not found." });
    }

    const request = student.tutorRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Only pending tutor requests can be cancelled." });
    }

    request.status = 'cancelled';
    await student.save();

    res.status(200).json({ message: "Tutor request cancelled." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to cancel tutor request." });
  }
});

// Route: PUT /api/users/my-tutor-requests/:studentId/:requestId
// Student updates an open pending request (date, time, message)
router.put('/my-tutor-requests/:studentId/:requestId', async (req, res) => {
  try {
    const { studentId, requestId } = req.params;
    const { preferredDate, preferredStartTime, preferredEndTime, message } = req.body;

    const dateErr = validateCalendarDateYyyyMmDd(preferredDate);
    if (dateErr) {
      return res.status(400).json({ error: dateErr });
    }
    if (!preferredStartTime || !preferredEndTime) {
      return res.status(400).json({ error: "Preferred start and end time are required." });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "User not found." });
    }

    const request = student.tutorRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Only pending tutor requests can be updated." });
    }

    request.preferredDate = String(preferredDate).trim();
    request.preferredTimeStart = String(preferredStartTime).trim();
    request.preferredTimeEnd = String(preferredEndTime).trim();
    request.message = typeof message === 'string' ? message.trim() : '';

    await student.save();

    res.status(200).json({ message: "Tutor request updated.", requestId: request._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update tutor request." });
  }
});

module.exports = router;