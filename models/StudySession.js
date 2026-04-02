const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  course: { 
    type: String, 
    required: true // e.g., "COMP307"
  },
  date: { 
    type: Date, 
    required: true 
  },
  location: { 
    type: String, 
    required: true // e.g., "Library Room 3" or a Zoom link
  },
  // This links the session to the specific User who created it
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  // An array of Users who have signed up to attend
  attendees: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('StudySession', studySessionSchema);