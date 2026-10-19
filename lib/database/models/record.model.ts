import mongoose from "mongoose";

export const workoutRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateString: {
      type: String, // "YYYY-MM-DD" formatted in user's local date
      required: true,
    },
    dayOfWeek: {
      type: Number, // 0 for Sunday, 1 for Monday, etc.
      required: true,
      min: 0,
      max: 6,
    },
    dayName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "missed"],
      required: true,
    },
    title: {
      type: String,
      required: true, // e.g. "Monday's workout - Completed" or "Monday's workout missed"
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    exercises: [
      {
        exerciseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exercise",
        },
        name: { type: String, required: true },
        primaryMuscleGroup: { type: String, default: "" },
        setsCount: { type: Number, default: 0 },
      },
    ],
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// A user can only have one workout record per calendar date
workoutRecordSchema.index({ userId: 1, dateString: 1 }, { unique: true });
workoutRecordSchema.index({ userId: 1, status: 1, dateString: -1 });

const WorkoutRecord =
  mongoose.models?.WorkoutRecord ||
  mongoose.model("WorkoutRecord", workoutRecordSchema);

export default WorkoutRecord;
