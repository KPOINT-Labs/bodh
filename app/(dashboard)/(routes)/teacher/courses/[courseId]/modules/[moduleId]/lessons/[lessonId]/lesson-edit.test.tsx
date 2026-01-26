import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonTitleForm } from "./_components/lesson-title-form";

// Mock router
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("LessonTitleForm", () => {
  it("displays initial title", () => {
    render(
      <LessonTitleForm
        courseId="1"
        initialData={{ title: "Lesson Title" }}
        lessonId="1"
        moduleId="1"
      />
    );
    expect(screen.getByText("Lesson Title")).toBeDefined();
  });

  it("switches to edit mode", () => {
    render(
      <LessonTitleForm
        courseId="1"
        initialData={{ title: "Lesson Title" }}
        lessonId="1"
        moduleId="1"
      />
    );
    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(screen.getByRole("textbox")).toBeDefined();
  });
});
