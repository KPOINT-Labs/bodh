import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
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
    render(<LessonTitleForm initialData={{ title: "Lesson Title" }} courseId="1" moduleId="1" lessonId="1" />);
    expect(screen.getByText("Lesson Title")).toBeDefined();
  });

  it("switches to edit mode", () => {
    render(<LessonTitleForm initialData={{ title: "Lesson Title" }} courseId="1" moduleId="1" lessonId="1" />);
    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(screen.getByRole("textbox")).toBeDefined();
  });
});
