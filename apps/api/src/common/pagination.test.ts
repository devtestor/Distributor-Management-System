import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { paginationArgs } from "./pagination";

describe("paginationArgs", () => {
  it("uses safe defaults when no query is provided", () => {
    assert.deepEqual(paginationArgs(), { skip: 0, take: 100 });
  });

  it("calculates offset from page and limit", () => {
    assert.deepEqual(paginationArgs({ page: "3", limit: "25" }), { skip: 50, take: 25 });
  });

  it("caps oversized limits", () => {
    assert.deepEqual(paginationArgs({ page: "1", limit: "9999" }), { skip: 0, take: 500 });
  });

  it("falls back for invalid page and limit values", () => {
    assert.deepEqual(paginationArgs({ page: "abc", limit: "-4" }), { skip: 0, take: 100 });
  });
});
