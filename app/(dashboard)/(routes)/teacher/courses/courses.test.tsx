import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DataTable } from "./_components/data-table";
import { columns } from "./_components/columns";

describe("DataTable", () => {
  it("renders 'No results' when data is empty", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText(/No results/i)).toBeDefined();
  });

  it("renders a list of courses", () => {
    const data = [
      {
        id: "1",
        title: "Test Course",
        isPublished: false,
        price: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: "Desc",
        thumbnail: null,
        difficulty: "beginner",
        estimatedDuration: 60,
        learningObjectives: [],
        categoryId: null,
      },
    ];
    render(<DataTable columns={columns} data={data as any} />);
    expect(screen.getByText(/Test Course/i)).toBeDefined();
  });
});