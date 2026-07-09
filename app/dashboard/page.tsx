import { Suspense } from "react";
import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="page-center">
          <p className="muted">Loading dashboard…</p>
        </main>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
