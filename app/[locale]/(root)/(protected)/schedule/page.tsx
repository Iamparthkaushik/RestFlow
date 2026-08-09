import { getExercises } from "@/lib/actions/workout";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const exercises = await getExercises();

  return (
    <div className="min-h-screen pt-20 px-4 w-full max-w-lg mx-auto pb-24">
      <div className="space-y-4 text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Schedule</h1>
        <p className="text-muted-foreground">Select a day and plan your workouts.</p>
      </div>

      <ScheduleClient allExercises={exercises} />
    </div>
  );
}
