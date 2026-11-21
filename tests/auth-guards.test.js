import { test } from "node:test";
import assert from "node:assert/strict";
import { guardUserUpdate, sanitizeNewUser } from "../src/config/auth.js";

test("public signup can only create students or tutors", () => {
  assert.equal(sanitizeNewUser({ role: "student" }).role, "student");
  assert.equal(sanitizeNewUser({ role: "tutor" }).role, "tutor");
  assert.equal(sanitizeNewUser({ role: "admin" }).role, "student");
  assert.equal(sanitizeNewUser({}).role, "student");
  assert.equal(sanitizeNewUser({ role: "admin" }).plan, "free");
});

test("public signup always starts on the free plan with safe defaults", () => {
  const user = sanitizeNewUser({
    role: "tutor",
    plan: "pro",
    phone: 123,
    bio: null,
    name: "Test Tutor",
  });

  assert.equal(user.plan, "free");
  assert.equal(user.phone, "");
  assert.equal(user.bio, "");
  assert.equal(user.name, "Test Tutor");
});

test("update-user cannot change the role field", () => {
  assert.throws(
    () => guardUserUpdate({ role: "admin" }),
    (error) => {
      assert.equal(error.status, "BAD_REQUEST");
      assert.equal(error.statusCode, 400);
      assert.equal(error.body?.code, "ROLE_NOT_EDITABLE");
      return true;
    }
  );
});

test("update-user still accepts harmless profile fields", () => {
  assert.deepEqual(guardUserUpdate({ name: "New Name" }), {
    data: { name: "New Name" },
  });
});
