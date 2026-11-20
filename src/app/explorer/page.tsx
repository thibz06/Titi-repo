import { Explorer } from "@/components/Explorer";

export default function ExplorerPage() {
  return (
    <main className="fixed inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom))]">
      <Explorer />
    </main>
  );
}
