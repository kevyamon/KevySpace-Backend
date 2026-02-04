const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titre requis'],
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: true
  },
  type: {
    type: String, // 'PDF', 'IMG', 'ZIP'
    default: 'FILE'
  },
  size: {
    type: String, // ex: "2.4 MB" (On le calculera ou le recevra)
    default: 'Unknown'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resource', ResourceSchema);