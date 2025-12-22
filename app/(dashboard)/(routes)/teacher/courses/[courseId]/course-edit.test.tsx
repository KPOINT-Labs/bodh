import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TitleForm } from "./_components/title-form";
import { DescriptionForm } from "./_components/description-form";

// Mock router
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("TitleForm", () => {
  it("displays initial title", () => {
    render(<TitleForm initialData={{ title: "Initial Title" }} courseId="1" />);
    expect(screen.getByText("Initial Title")).toBeDefined();
  });

  it("switches to edit mode", () => {
    render(<TitleForm initialData={{ title: "Initial Title" }} courseId="1" />);
    const editBtn = screen.getByRole("button", { name: /Edit/i });
    fireEvent.click(editBtn);
    expect(screen.getByRole("textbox")).toBeDefined();
  });
});

describe("DescriptionForm", () => {
  it("displays initial description", () => {
    render(<DescriptionForm initialData={{ description: "Desc" }} courseId="1" />);
    expect(screen.getByText("Desc")).toBeDefined();
  });

  it("displays fallback when empty", () => {
    render(<DescriptionForm initialData={{ description: null }} courseId="1" />);
    expect(screen.getByText("No description")).toBeDefined();
  });
});