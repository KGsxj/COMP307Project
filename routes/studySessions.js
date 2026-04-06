const express = require('express');
const router = express.Router();
const StudySession = require('../models/StudySession');
const User = require('../models/User');

// Route: POST /api/sessions
// Allow a user to create a new study group
router.post('/', async (req, res) => {
  try {
    // Details of the study session from the customer's request
    const { title, course, startTime, endTime, location, createdBy } = req.body;

    // Verify whether it's an organizer who creates a session or not
    const user = await User.findById(createdBy);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (user.role !== 'organizer') {
      return res.status(403).json({
        error: "Access denied, only organizers can create study sessions."
      });
    }

    const newSession = new StudySession({
      title: title,
      course: course,
      startTime: startTime, 
      endTime: endTime,     
      location: location,
      createdBy: createdBy 
    });

    // Save it to the database
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

// Route: GET /api/sessions
// Fetch all study sessions so they can be displayed on the screen
router.get('/', async (req, res) => {
  try {
    // find all study sessions
    const sessions = await StudySession.find().populate('createdBy', 'name email');
    
    // Send the list back to the customer
    res.status(200).json(sessions);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch study sessions." });
  }
});

// Route: PUT /api/sessions/:id/join
// Add a user to the attendees list of a specific session
router.put('/:id/join', async (req, res) => {
  try {
    // Get the ID of the session from the URL
    const sessionId = req.params.id;
    const session = await StudySession.findById(sessionId);
    
    // Get the ID of the user who wants to join from the request body
    const { userId } = req.body;
    
    if (!session) {
      return res.status(404).json({ error: "Study session not found." });
    }

    // Check if the user is already on the list
    if (session.attendees.includes(userId)) {
      return res.status(400).json({ error: "You are already registered for this session" });
    }

    // Add the user to the list
    session.attendees.push(userId);
    const updatedSession = await session.save();

    // Send a success message back
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

    //Find sessions matching EITHER condition
    const mySessions = await StudySession.find({
      $or: [
        { createdBy: userId },  
        { attendees: userId }        
      ]
    }).populate('createdBy', 'name email'); // see host real name

    // Return all sessions
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