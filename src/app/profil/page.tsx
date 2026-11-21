import { ProfileView } from "@/components/ProfileView";
import { loadPlaces, toSummary } from "@/content/load";

export default function ProfilePage() {
  return <ProfileView places={loadPlaces().map(toSummary)} />;
}
