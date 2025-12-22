import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CreatePage from "./page";

// Mock the toaster
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useRouter
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("Create Course Page", () => {
  it("renders the form", () => {
    render(<CreatePage />);
    expect(screen.getByRole("heading", { name: /Name your course/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeDefined();
  });

  it("validates empty input", async () => {
    render(<CreatePage />);
    const submitBtn = screen.getByRole("button", { name: /Continue/i });
    
    fireEvent.click(submitBtn);
    
    // Check for validation error (async because RHF validation is async)
    expect(await screen.findByText(/Title is required/i)).toBeDefined();
  });
});
