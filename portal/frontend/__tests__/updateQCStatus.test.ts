import * as fs from "fs";
import * as path from "path";

const actionsFilePath = path.resolve(
  __dirname,
  "../lib/actions/index.ts"
);
const actionsSource = fs.readFileSync(actionsFilePath, "utf-8");

describe("updateQCStatus", () => {
  it("should include qc_by in the UPDATE SQL", () => {
    expect(actionsSource).toContain("qc_by");
  });

  it("should include qc_reviewed_at in the UPDATE SQL", () => {
    // Verify the UPDATE statement sets qc_reviewed_at
    expect(actionsSource).toMatch(/UPDATE\s+scans[\s\S]*?qc_reviewed_at\s*=\s*NOW\(\)/);
  });

  it("should accept a reviewerId parameter in the function signature", () => {
    // The function signature should include reviewerId as the third parameter
    expect(actionsSource).toMatch(
      /export\s+async\s+function\s+updateQCStatus\s*\(\s*scanId\s*:\s*string\s*,\s*status\s*:\s*['"]Approved['"]\s*\|\s*['"]Rejected['"]\s*,\s*reviewerId\s*:\s*string\s*\)/
    );
  });

  it("should pass reviewerId as a query parameter", () => {
    // Extract the updateQCStatus function body and verify reviewerId is in the params array
    const fnMatch = actionsSource.match(
      /export\s+async\s+function\s+updateQCStatus[\s\S]*?\n\}/
    );
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("reviewerId");
    expect(fnBody).toMatch(/\[\s*status\s*,\s*reviewerId\s*,\s*scanId\s*\]/);
  });
});
