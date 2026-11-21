import { Explorer } from "@/components/Explorer";
import { loadSummaries } from "@/content/load";

export default function ExplorerPage() {
  return (
    <main className="fixed inset-0">
      <Explorer places={loadSummaries()} />
    </main>
  );
}
