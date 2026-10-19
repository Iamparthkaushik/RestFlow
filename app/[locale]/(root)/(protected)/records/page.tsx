import { getRecordsData } from "@/lib/actions/workout";
import RecordsClient from "./RecordsClient";

export default async function RecordsPage() {
  const data = await getRecordsData(0);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Unable to load records.</p>
      </div>
    );
  }

  return <RecordsClient initialData={data} />;
}
