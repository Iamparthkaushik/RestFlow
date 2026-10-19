import mongoose from "mongoose";

export const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  systemicFatiguePoints: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["in-progress", "completed", "cancelled"],
    default: "in-progress"
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6
  },
  dateString: {
    type: String
  },
  sets: [{
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true
    },
    setNumber: {
      type: Number,
      required: true
    },
    reps: {
      type: Number,
      required: true
    },
    weightKg: {
      type: Number,
      default: 0 // Bodyweight by default for calisthenics
    },
    rpeRating: {
      type: String,
      enum: ["easy", "solid", "hard", "limit"],
      required: true
    },
    suggestedRest: {
      type: Number,
      required: true
    },
    actualRestTaken: {
      type: Number,
      required: true
    },
    manualOverride: {
      type: Boolean,
      default: false
    }
  }]
}, { timestamps: true });

const Session = mongoose.models?.Session || mongoose.model("Session", sessionSchema);

export default Session;
