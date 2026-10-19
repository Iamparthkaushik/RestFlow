import { getExercises } from "@/lib/actions/workout";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const exercises = await getExercises();

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex-1">
      <div className="space-y-4 text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Schedule</h1>
        <p className="text-muted-foreground">Select a day and plan your workouts.</p>
      </div>

      <ScheduleClient allExercises={exercises} />
    </div>
  );
}
