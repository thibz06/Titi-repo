import { Suspense } from "react";
import { Explorer } from "@/components/Explorer";
import { loadSummaries } from "@/content/load";

export default function ExplorerPage() {
  return (
    <main className="fixed inset-0">
      <Suspense>
        <Explorer places={loadSummaries()} />
      </Suspense>
    </main>
  );
}
