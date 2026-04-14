import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("merges tailwind conflicts", () => {
    // twMerge should resolve conflicting tailwind classes
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });
});
