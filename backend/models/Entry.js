const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    time: {
      // stored as 24hr "HH:MM" string, e.g. "08:30"
      type: String,
      required: [true, 'Time is required'],
    },
    glucoseLevel: {
      type: Number,
      required: [true, 'Glucose level is required'],
      min: [0, 'Glucose level cannot be negative'],
    },
    insulinUnits: {
      type: Number,
      required: [true, 'Insulin units are required'],
      min: [0, 'Insulin units cannot be negative'],
    },
    mealDescription: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Speeds up "get all entries for a given day" queries
entrySchema.index({ date: 1 });

module.exports = mongoose.model('Entry', entrySchema);
