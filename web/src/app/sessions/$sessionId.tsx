import { createFileRoute } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { useSessionHistory } from "@/lib/api";

export const Route = createFileRoute("/sessions/$sessionId")({
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const { data, isLoading } = useSessionHistory(sessionId);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data?.messages?.length ?? 0} messages in session{" "}
            <code className="text-xs">{sessionId}</code>
          </p>
        )}
      </div>
    </div>
  );
}
