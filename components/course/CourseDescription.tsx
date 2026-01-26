import { Card } from "@/components/ui/card";

interface CourseDescriptionProps {
  title: string;
  description: string;
  learningObjectives: string[];
  analogy?: string;
  currentSection?: string;
}

export function CourseDescription({
  title,
  description,
  learningObjectives,
  analogy,
  currentSection = "Lecture 1",
}: CourseDescriptionProps) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-xl">Welcome to {title}!</h2>

      <div className="space-y-4 text-muted-foreground text-sm">
        <p>{description}</p>

        <div className="space-y-2">
          <p className="font-medium text-foreground">You'll learn:</p>
          <ul className="ml-4 list-disc space-y-1">
            {learningObjectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </div>

        {analogy && <p>{analogy}</p>}
      </div>

      <div className="mt-6">
        <p className="mb-2 font-medium text-sm">
          Let's start with {currentSection}
        </p>
      </div>
    </Card>
  );
}
