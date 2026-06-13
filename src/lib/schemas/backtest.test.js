import { describe, it, expect } from "vitest";
import {
  sessionMetaSchema,
  sessionTagSchema,
  MAX_SESSION_TAGS,
} from "./backtest";

describe("sessionTagSchema", () => {
  it("accepts a valid tag and trims whitespace", () => {
    const result = sessionTagSchema.safeParse("  breakout  ");
    expect(result.success).toBe(true);
    expect(result.data).toBe("breakout");
  });

  it("rejects an empty tag with a clear message", () => {
    const result = sessionTagSchema.safeParse("   ");
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Tag cannot be empty");
  });

  it("rejects a tag longer than 30 characters", () => {
    const result = sessionTagSchema.safeParse("a".repeat(31));
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      "Tags must be 30 characters or fewer"
    );
  });

  it("rejects non-string values", () => {
    expect(sessionTagSchema.safeParse(42).success).toBe(false);
    expect(sessionTagSchema.safeParse(null).success).toBe(false);
  });
});

describe("sessionMetaSchema", () => {
  it("accepts a valid note and tag list", () => {
    const result = sessionMetaSchema.safeParse({
      note: "  Solid session, respected the stop every time.  ",
      tags: ["breakout", "NY open"],
    });
    expect(result.success).toBe(true);
    expect(result.data.note).toBe(
      "Solid session, respected the stop every time."
    );
    expect(result.data.tags).toEqual(["breakout", "NY open"]);
  });

  it("accepts an empty note and no tags", () => {
    const result = sessionMetaSchema.safeParse({ note: "", tags: [] });
    expect(result.success).toBe(true);
  });

  it("rejects a note longer than 2,000 characters", () => {
    const result = sessionMetaSchema.safeParse({
      note: "a".repeat(2001),
      tags: [],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      "Note must be 2,000 characters or fewer"
    );
  });

  it(`rejects more than ${MAX_SESSION_TAGS} tags`, () => {
    const result = sessionMetaSchema.safeParse({
      note: "",
      tags: Array.from({ length: MAX_SESSION_TAGS + 1 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe(
      `A session can have at most ${MAX_SESSION_TAGS} tags`
    );
  });

  it("rejects an invalid tag inside the list", () => {
    const result = sessionMetaSchema.safeParse({
      note: "",
      tags: ["valid", "  "],
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Tag cannot be empty");
  });

  it("rejects wrong field types", () => {
    expect(sessionMetaSchema.safeParse({ note: 123, tags: [] }).success).toBe(
      false
    );
    expect(
      sessionMetaSchema.safeParse({ note: "", tags: "not-an-array" }).success
    ).toBe(false);
    expect(sessionMetaSchema.safeParse({}).success).toBe(false);
  });
});
