const express = require('express');
const router = express.Router();
const StudySession = require('../models/StudySession');
const User = require('../models/User');

// Route: GET /api/sessions
// Fetch all study sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await StudySession.find()
      .populate('createdBy', 'name email');

    res.status(200).json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch study sessions.' });
  }
});

// Route: POST /api/sessions
// Allow a user to create a new study group
router.post('/', async (req, res) => {
  try {
    const { title, course, sessionType, startTime, endTime, location, createdBy } = req.body;

    if (!title || !course || !startTime || !endTime || !location || !createdBy) {
      return res.status(400).json({ error: "All required fields must be provided to create a session." });
    }

    const user = await User.findById(createdBy);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Global Role Check
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return res.status(403).json({ error: "Only approved organizers can create sessions." });
    }

    if (user.role === 'organizer') {
      const isApprovedForCourse = user.courseRoles.some(
        r => r.course === course && r.status === 'approved'
      );

      if (!isApprovedForCourse) {
        return res.status(403).json({
          error: `Access Denied: You are not an approved Organizer for ${course}.`
        });
      }
    }

    const newSession = new StudySession({
      title,
      course,
      sessionType: sessionType || 'review',
      startTime,
      endTime,
      location,
      createdBy
    });

    const savedSession = await newSession.save();

    res.status(201).json({
      message: "📚 Study session created successfully!",
      session: savedSession
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create study session." });
  }
});

// Route: PUT /api/sessions/:id
// Securely modify a session's time or location
router.put('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { startTime, endTime, location } = req.body;

    const safeUpdates = {};
    if (startTime) safeUpdates.startTime = startTime;
    if (endTime) safeUpdates.endTime = endTime;
    if (location) safeUpdates.location = location;

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update." });
    }

    const updatedSession = await StudySession.findByIdAndUpdate(
      sessionId,
      { $set: safeUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedSession) {
      return res.status(404).json({ error: "Session not found." });
    }

    res.status(200).json({
      message: "Reservation modified successfully!",
      session: updatedSession
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to modify reservation." });
  }
});

// Route: DELETE /api/sessions/:id
// Organizer completely cancels/deletes a reservation
router.delete('/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;

    const deletedSession = await StudySession.findByIdAndDelete(sessionId);

    if (!deletedSession) {
      return res.status(404).json({ error: "Session not found." });
    }

    res.status(200).json({ message: "Reservation cancelled successfully." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to cancel reservation." });
  }
});

// Route: GET /api/sessions/organizer/:id
// Fetch all sessions hosted by a specific organizer
router.get('/organizer/:id', async (req, res) => {
  try {
    const organizerId = req.params.id;

    const sessions = await StudySession.find({ createdBy: organizerId })
      .populate('createdBy', 'name email');

    res.status(200).json(sessions);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch organizer schedule." });
  }
});

// Route: PUT /api/sessions/:id/join
// Add a user to the attendees list of a specific session
router.put('/:id/join', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required to join a session." });
    }

    const sessionExists = await StudySession.findById(sessionId);
    if (!sessionExists) {
      return res.status(404).json({ error: "Study session not found." });
    }

    const isAlreadyRegistered = sessionExists.attendees.some(id => id.toString() === userId);
    if (isAlreadyRegistered) {
      return res.status(400).json({ error: "You are already registered for this session." });
    }

    const updatedSession = await StudySession.findByIdAndUpdate(
      sessionId,
      { $addToSet: { attendees: userId } },
      { new: true }
    );

    res.status(200).json({
      message: "🎉 Successfully joined the study session!",
      session: updatedSession
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to join session." });
  }
});

// Route: GET /api/sessions/user/:userId
// Fetch the sessions organized or attended for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const mySessions = await StudySession.find({
      $or: [
        { createdBy: userId },
        { attendees: userId }
      ]
    }).populate('createdBy', 'name email');

    res.status(200).json({
      message: "Here is your upcoming schedule!",
      count: mySessions.length,
      sessions: mySessions
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch your schedule." });
  }
});

module.exports = router;