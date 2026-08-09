import mongoose from "mongoose";

export const userExerciseAdjustmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  exerciseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exercise",
    required: true
  },
  adjustmentFactor: {
    type: Number,
    default: 1.0 // EMA-updated after overrides
  }
}, { timestamps: true });

// Ensure unique index so each user has only one adjustment per exercise
userExerciseAdjustmentSchema.index({ userId: 1, exerciseId: 1 }, { unique: true });

const UserExerciseAdjustment = mongoose.models?.UserExerciseAdjustment || mongoose.model("UserExerciseAdjustment", userExerciseAdjustmentSchema);

export default UserExerciseAdjustment;
