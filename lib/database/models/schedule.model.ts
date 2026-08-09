import mongoose from "mongoose";

export const userScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  dayOfWeek: {
    type: Number, // 0 for Sunday, 1 for Monday, etc.
    required: true,
    min: 0,
    max: 6
  },
  exercises: [{
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true
    },
    order: {
      type: Number,
      default: 0
    }
  }]
}, { timestamps: true });

// Each user can have only one schedule document per day of the week
userScheduleSchema.index({ userId: 1, dayOfWeek: 1 }, { unique: true });

const UserSchedule = mongoose.models?.UserSchedule || mongoose.model("UserSchedule", userScheduleSchema);

export default UserSchedule;
