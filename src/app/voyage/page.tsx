import { TripView } from "@/components/TripView";
import { loadPlanData } from "@/content/load";

export default function TripPage() {
  return <TripView data={loadPlanData()} />;
}
