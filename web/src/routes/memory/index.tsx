import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit } from "lucide-react";

export const Route = createFileRoute("/memory/")({
  component: MemoryPage,
});

function MemoryPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-muted-foreground">
      <BrainCircuit className="size-12" />
      <p className="text-sm">Memory — coming soon</p>
    </div>
  );
}
