import { getUserSchedule } from "@/lib/actions/workout";
import WorkoutClient from "./WorkoutClient";

export default async function WorkoutPage(props: {
  searchParams?: Promise<{ day?: string }> | { day?: string };
}) {
  const searchParams = await props.searchParams;
  const todayDay = new Date().getDay();
  const day = searchParams?.day !== undefined ? Number(searchParams.day) : todayDay;
  const schedule = await getUserSchedule(day);

  return (
    <div className="min-h-screen pt-20 px-4 w-full max-w-lg mx-auto pb-24 flex flex-col">
      <WorkoutClient 
        initialSchedule={schedule?.exercises || []} 
        dayOfWeek={day}
      />
    </div>
  );
}
