import { Link, createFileRoute } from "@tanstack/react-router";
import type { Session } from "agentara";
import { MessageSquare } from "lucide-react";

import { useSessions } from "@/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/sessions/")({
  component: SessionsPage,
});

function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <ScrollArea className="flex-1">
        <div className="grid gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </CardHeader>
              </Card>
            ))
          ) : sessions?.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare />
                </EmptyMedia>
                <EmptyTitle>No sessions yet</EmptyTitle>
                <EmptyDescription>
                  Start a conversation to create your first session.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            sessions?.map((session: Session) => (
              <Link
                key={session.id}
                to="/sessions/$sessionId"
                params={{ sessionId: session.id }}
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="flex-row items-center gap-3 py-3">
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-sm">
                        {session.id}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {session.agent_type} &middot;{" "}
                        {new Date(session.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
