import { test } from "node:test";
import assert from "node:assert/strict";
import { getPriceForRole, PLAN_PRICES } from "../src/config/stripe.js";

test("students and tutors have the documented server-side prices", () => {
  assert.deepEqual(getPriceForRole("student"), {
    planName: "pro",
    amount: 1000,
    label: "Student Pro",
  });
  assert.deepEqual(getPriceForRole("tutor"), {
    planName: "pro",
    amount: 1500,
    label: "Tutor Pro",
  });
  assert.equal(PLAN_PRICES.student.amount, 1000);
  assert.equal(PLAN_PRICES.tutor.amount, 1500);
});

test("admins and unknown roles cannot start a checkout", () => {
  for (const role of ["admin", "owner", "", null, undefined]) {
    assert.throws(
      () => getPriceForRole(role),
      (error) => error.status === 403
    );
  }
});
