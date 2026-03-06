import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <h1 className="font-serif text-4xl tracking-tight text-muted-foreground">
        📯 Keep Vibe and Carry On
      </h1>
    </div>
  );
}
