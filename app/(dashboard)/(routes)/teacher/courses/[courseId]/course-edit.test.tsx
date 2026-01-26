import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DescriptionForm } from "./_components/description-form";
import { TitleForm } from "./_components/title-form";

// Mock router
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("TitleForm", () => {
  it("displays initial title", () => {
    render(<TitleForm courseId="1" initialData={{ title: "Initial Title" }} />);
    expect(screen.getByText("Initial Title")).toBeDefined();
  });

  it("switches to edit mode", () => {
    render(<TitleForm courseId="1" initialData={{ title: "Initial Title" }} />);
    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(screen.getByRole("textbox")).toBeDefined();
  });
});

describe("DescriptionForm", () => {
  it("displays initial description", () => {
    render(
      <DescriptionForm courseId="1" initialData={{ description: "Desc" }} />
    );
    expect(screen.getByText("Desc")).toBeDefined();
  });

  it("displays fallback when empty", () => {
    render(
      <DescriptionForm courseId="1" initialData={{ description: null }} />
    );
    expect(screen.getByText("No description")).toBeDefined();
  });
});
