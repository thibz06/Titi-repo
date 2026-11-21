import { Explorer } from "@/components/Explorer";
import { loadSummaries } from "@/content/load";

/** Relecture : les brouillons, clairement signalés comme non vérifiés. */
export default function ReviewPage() {
  return (
    <main className="fixed inset-0">
      <Explorer places={loadSummaries("draft")} draftCount={0} review />
    </main>
  );
}
