import { createFileRoute } from "@tanstack/react-router";
import type { Skill } from "agentara";
import { SparklesIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSkills } from "@/lib/api";

export const Route = createFileRoute("/skills/")({
  component: SkillsPage,
});

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Card className="hover:bg-accent/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{skill.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {skill.description}
        </CardDescription>
      </CardHeader>
      {skill.license && (
        <CardContent className="pt-0">
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
            {skill.license}
          </span>
        </CardContent>
      )}
    </Card>
  );
}

function SkillsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-12 w-full" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <SparklesIcon className="size-10 opacity-30" />
      <p className="text-sm">No skills installed</p>
      <p className="text-xs">
        Install skills via{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          claude install
        </code>
      </p>
    </div>
  );
}

function SkillsPage() {
  const { data: skills, isLoading } = useSkills();

  return (
    <ScrollArea className="flex flex-col gap-6 h-full">
      <div className="container mx-auto h-full p-6">
        {isLoading ? (
          <SkillsSkeleton />
        ) : (skills?.length ?? 0) === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skills!.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
