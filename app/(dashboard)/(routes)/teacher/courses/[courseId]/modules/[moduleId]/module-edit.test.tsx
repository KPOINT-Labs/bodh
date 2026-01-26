import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModuleTitleForm } from "./_components/module-title-form";

// Mock router
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("ModuleTitleForm", () => {
  it("displays initial title", () => {
    render(
      <ModuleTitleForm
        courseId="1"
        initialData={{ title: "Module Title" }}
        moduleId="1"
      />
    );
    expect(screen.getByText("Module Title")).toBeDefined();
  });

  it("switches to edit mode", () => {
    render(
      <ModuleTitleForm
        courseId="1"
        initialData={{ title: "Module Title" }}
        moduleId="1"
      />
    );
    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(screen.getByRole("textbox")).toBeDefined();
  });
});
