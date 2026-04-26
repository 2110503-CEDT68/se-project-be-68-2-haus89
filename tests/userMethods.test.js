const { buildPagination, buildQueryFilter } = require("../utils/queryUtils");

describe("buildPagination", () => {
  test("returns empty object when on the only page", () => {
    const result = buildPagination(1, 10, 5);
    expect(result).toEqual({});
  });

  test("includes next when more pages follow", () => {
    const result = buildPagination(1, 10, 25);
    expect(result.next).toEqual({ page: 2, limit: 10 });
    expect(result.prev).toBeUndefined();
  });

  test("includes prev when not on the first page", () => {
    const result = buildPagination(3, 10, 25);
    expect(result.prev).toEqual({ page: 2, limit: 10 });
    expect(result.next).toBeUndefined();
  });

  test("includes both next and prev on a middle page", () => {
    const result = buildPagination(2, 10, 31);
    expect(result.next).toEqual({ page: 3, limit: 10 });
    expect(result.prev).toEqual({ page: 1, limit: 10 });
  });

  test("no next when endIndex exactly equals total", () => {
    const result = buildPagination(2, 10, 20);
    expect(result.next).toBeUndefined();
  });
});


describe("buildQueryFilter", () => {
  test("strips reserved fields from the filter", () => {
    const query = { select: "name", sort: "createdAt", page: "2", limit: "10", name: "Alice" };
    const result = buildQueryFilter(query);
    expect(result).not.toHaveProperty("select");
    expect(result).not.toHaveProperty("sort");
    expect(result).not.toHaveProperty("page");
    expect(result).not.toHaveProperty("limit");
    expect(result.name).toBe("Alice");
  });

  test("replaces comparison operators with $ prefixed equivalents", () => {
    const query = { yearsOfExperience: { gte: "5", lte: "20" } };
    const result = buildQueryFilter(query);
    expect(result.yearsOfExperience).toHaveProperty("$gte", "5");
    expect(result.yearsOfExperience).toHaveProperty("$lte", "20");
    expect(result.yearsOfExperience).not.toHaveProperty("gte");
  });

  test("merges extraMatch fields into the result", () => {
    const query = { name: "Bob" };
    const result = buildQueryFilter(query, { role: "dentist" });
    expect(result.role).toBe("dentist");
    expect(result.name).toBe("Bob");
  });

  test("returns only extraMatch when query has no relevant fields", () => {
    const query = { page: "1", limit: "25" };
    const result = buildQueryFilter(query, { role: "dentist" });
    expect(result).toEqual({ role: "dentist" });
  });

  test("handles gt, lt, and in operators", () => {
    const query = { rating: { gt: "3" }, tags: { in: ["a", "b"] } };
    const result = buildQueryFilter(query);
    expect(result.rating).toHaveProperty("$gt", "3");
    expect(result.tags).toHaveProperty("$in");
  });
});
