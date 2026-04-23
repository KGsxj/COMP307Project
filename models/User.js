const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['student', 'organizer', 'admin'],
    default: 'student'
  },
  applicationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  courseRoles: [{
    course: { type: String, required: true }, // e.g., "COMP307"
    gpa: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  }],
  tutorRequests: [{
    course: { type: String, required: true },
    requestedTutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, default: '' },
    preferredDate: { type: String, default: '' },
    preferredTimeStart: { type: String, default: '' },
    preferredTimeEnd: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });


module.exports = mongoose.model('User', userSchema);