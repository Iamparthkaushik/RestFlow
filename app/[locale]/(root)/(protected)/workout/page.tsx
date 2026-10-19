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
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col flex-1">
      <WorkoutClient 
        initialSchedule={schedule?.exercises || []} 
        dayOfWeek={day}
      />
    </div>
  );
}
