import { BreathingVisualizer } from "@/components/breathing/BreathingVisualizer";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Guided Breathing — Ergo TMS" };

export default function BreathePage() {
  return (
    <div className="animate-fadeUp">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Guided 4-7-8 breathing</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Follow the expanding circle. Inhale quietly through the nose for 4 seconds, hold for 7, then exhale fully through the mouth for 8.
          Completed sessions count toward today&apos;s protocol compliance.
        </p>
      </header>
      <Card>
        <BreathingVisualizer />
      </Card>
    </div>
  );
}
