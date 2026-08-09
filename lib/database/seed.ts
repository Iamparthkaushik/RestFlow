import mongoose from "mongoose";
import Exercise from "./models/exercise.model";
import connectDB from "./db";

// Top 20 Calisthenics Exercises
const calisthenicsExercises = [
  { name: "Pull-ups", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "back" },
  { name: "Dips", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "chest" },
  { name: "Push-ups", icon: "Activity", energyTaxLevel: 2, systemicLoadPoints: 1.0, primaryMuscleGroup: "chest" },
  { name: "Muscle-ups", icon: "Activity", energyTaxLevel: 5, systemicLoadPoints: 2.5, primaryMuscleGroup: "full-body" },
  { name: "Front Lever", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "core" },
  { name: "Back Lever", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "core" },
  { name: "Planche", icon: "Activity", energyTaxLevel: 5, systemicLoadPoints: 2.5, primaryMuscleGroup: "shoulders" },
  { name: "Handstand Push-ups", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "shoulders" },
  { name: "Pistol Squats", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "legs" },
  { name: "Bodyweight Squats", icon: "Activity", energyTaxLevel: 2, systemicLoadPoints: 1.0, primaryMuscleGroup: "legs" },
  { name: "L-Sit", icon: "Activity", energyTaxLevel: 3, systemicLoadPoints: 1.5, primaryMuscleGroup: "core" },
  { name: "Dragon Flag", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "core" },
  { name: "Chin-ups", icon: "Activity", energyTaxLevel: 3, systemicLoadPoints: 1.5, primaryMuscleGroup: "back" },
  { name: "Diamond Push-ups", icon: "Activity", energyTaxLevel: 3, systemicLoadPoints: 1.5, primaryMuscleGroup: "arms" },
  { name: "Bulgarian Split Squats", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "legs" },
  { name: "Toes to Bar", icon: "Activity", energyTaxLevel: 3, systemicLoadPoints: 1.5, primaryMuscleGroup: "core" },
  { name: "Inverted Rows", icon: "Activity", energyTaxLevel: 2, systemicLoadPoints: 1.0, primaryMuscleGroup: "back" },
  { name: "Pike Push-ups", icon: "Activity", energyTaxLevel: 3, systemicLoadPoints: 1.5, primaryMuscleGroup: "shoulders" },
  { name: "Burpees", icon: "Activity", energyTaxLevel: 4, systemicLoadPoints: 2.0, primaryMuscleGroup: "full-body" },
  { name: "Lunges", icon: "Activity", energyTaxLevel: 2, systemicLoadPoints: 1.0, primaryMuscleGroup: "legs" }
];

export async function seedExercises() {
  try {
    await connectDB();
    
    console.log("Seeding exercises...");
    
    for (const ex of calisthenicsExercises) {
      // Calculate mTax based on energyTaxLevel
      const mTax = 0.55 + (ex.energyTaxLevel * 0.15);
      
      await Exercise.findOneAndUpdate(
        { name: ex.name },
        { 
          $set: {
            icon: ex.icon,
            energyTaxLevel: ex.energyTaxLevel,
            mTax: Number(mTax.toFixed(2)),
            systemicLoadPoints: ex.systemicLoadPoints,
            primaryMuscleGroup: ex.primaryMuscleGroup
          }
        },
        { upsert: true, new: true }
      );
    }
    
    console.log("Seeding complete! 20 exercises added/updated.");
  } catch (error) {
    console.error("Error seeding exercises:", error);
  }
}
