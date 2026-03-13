import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { useTaskDelete, useTasks } from "@/lib/api";

import { TaskKanban } from "../../components/task-kanban";

export const Route = createFileRoute("/tasks/")({
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks, isLoading } = useTasks({ refreshInterval: 3000 });
  const deleteTask = useTaskDelete();
  const handleCopyTaskId = async (taskId: string) => {
    await navigator.clipboard.writeText(taskId);
    toast.info("Task ID copied to clipboard");
  };
  const handleDeleteTask = (taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => toast.success("Task deleted"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
    });
  };
  if (!isLoading && (!tasks || tasks.length === 0)) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquare />
          </EmptyMedia>
          <EmptyTitle>No tasks yet</EmptyTitle>
          <EmptyDescription>
            Start a task to create your first task.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <TaskKanban
      className="container-md mx-auto"
      tasks={tasks ?? []}
      isLoading={isLoading}
      onCopyTaskId={handleCopyTaskId}
      onDeleteTask={handleDeleteTask}
      deletingTaskId={deleteTask.isPending ? deleteTask.variables : null}
    />
  );
}
