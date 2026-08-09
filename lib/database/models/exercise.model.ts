import mongoose from "mongoose";

export const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  icon: {
    type: String, // String representation of the lucide-react icon name
    default: "Activity"
  },
  energyTaxLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  mTax: {
    type: Number,
    required: true
  },
  systemicLoadPoints: {
    type: Number,
    required: true
  },
  primaryMuscleGroup: {
    type: String,
    required: true,
    enum: ["chest", "back", "legs", "shoulders", "arms", "core", "full-body"]
  }
});

const Exercise = mongoose.models?.Exercise || mongoose.model("Exercise", exerciseSchema);

export default Exercise;
