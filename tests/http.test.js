import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import {
  ApiError,
  escapeRegex,
  paginationMeta,
  parsePagination,
  serialize,
  toObjectId,
} from "../src/utils/http.js";

test("ApiError keeps status, message and details", () => {
  const error = new ApiError(422, "Invalid input", [{ field: "title" }]);
  assert.equal(error.status, 422);
  assert.equal(error.message, "Invalid input");
  assert.deepEqual(error.details, [{ field: "title" }]);
  assert.ok(error instanceof Error);
});

test("toObjectId accepts a valid id", () => {
  const id = new ObjectId().toString();
  assert.equal(toObjectId(id).toString(), id);
});

test("toObjectId rejects malformed ids with 400", () => {
  assert.throws(() => toObjectId("not-an-id", "tuition id"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.message, "Invalid tuition id");
    return true;
  });
});

test("serialize converts _id to id and handles arrays", () => {
  const id = new ObjectId();
  assert.deepEqual(serialize({ _id: id, name: "A" }), {
    id: id.toString(),
    name: "A",
  });
  assert.deepEqual(serialize([{ _id: id }, { id: "kept" }]), [
    { id: id.toString() },
    { id: "kept" },
  ]);
  assert.equal(serialize(null), null);
});

test("parsePagination applies defaults and clamps values", () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 9, skip: 0 });
  assert.deepEqual(parsePagination({ page: "3", limit: "5" }), {
    page: 3,
    limit: 5,
    skip: 10,
  });
  assert.deepEqual(parsePagination({ page: "-4", limit: "500" }, 10, 50), {
    page: 1,
    limit: 50,
    skip: 0,
  });
});

test("escapeRegex neutralizes special characters", () => {
  assert.equal(escapeRegex("a+b(c)"), "a\\+b\\(c\\)");
});

test("paginationMeta reports page boundaries", () => {
  assert.deepEqual(paginationMeta(12, 2, 5), {
    total: 12,
    page: 2,
    limit: 5,
    totalPages: 3,
    hasNextPage: true,
    hasPrevPage: true,
  });
  assert.equal(paginationMeta(0, 1, 9).totalPages, 1);
  assert.equal(paginationMeta(9, 1, 9).hasNextPage, false);
});
