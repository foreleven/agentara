import { useQuery } from "@tanstack/react-query";
import type { Message, Session, Task } from "agentara";

import { api } from "@/api/client";

/**
 * Fetches all sessions.
 */
export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () =>
      api.sessions.$get().then((res) => res.json() as Promise<Session[]>),
  });
}

/**
 * Fetches the message history for a given session.
 */
export function useSessionHistory(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "history"],
    queryFn: () =>
      api.sessions[":id"].history
        .$get({ param: { id: sessionId } })
        .then((res) => res.json() as Promise<{ messages: Message[] }>),
    enabled: !!sessionId,
  });
}

/**
 * Fetches all current tasks.
 */
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () =>
      api.tasks.$get().then((res) => res.json() as Promise<Task[]>),
  });
}

/**
 * Dispatches a new inbound message task.
 */
export function useTaskDispatch() {}
