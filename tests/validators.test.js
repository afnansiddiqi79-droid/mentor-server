import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationCreateSchema,
  approvalUpdateSchema,
  checkoutSchema,
  profileUpdateSchema,
  roleUpdateSchema,
  tuitionCreateSchema,
  tuitionUpdateSchema,
} from "../src/validators/schemas.js";

const validTuition = {
  title: "Higher Mathematics for Class 11",
  subject: "Mathematics",
  classLevel: "Class 11-12",
  mode: "Online",
  location: "Dhanmondi, Dhaka",
  monthlyFee: "4500",
  daysPerWeek: "3",
  bannerImage: "https://i.ibb.co/example/banner.jpg",
  description:
    "Weekly live classes covering calculus, algebra and exam strategy.",
};

test("tuitionCreateSchema accepts valid input and coerces numbers", () => {
  const parsed = tuitionCreateSchema.parse(validTuition);
  assert.equal(parsed.monthlyFee, 4500);
  assert.equal(parsed.daysPerWeek, 3);
});

test("tuitionCreateSchema rejects short titles and invalid modes", () => {
  const shortTitle = tuitionCreateSchema.safeParse({
    ...validTuition,
    title: "Math",
  });
  assert.equal(shortTitle.success, false);

  const badMode = tuitionCreateSchema.safeParse({
    ...validTuition,
    mode: "Hybrid",
  });
  assert.equal(badMode.success, false);
});

test("tuitionUpdateSchema requires at least one field", () => {
  assert.equal(tuitionUpdateSchema.safeParse({}).success, false);
  assert.equal(
    tuitionUpdateSchema.safeParse({ monthlyFee: 3000 }).success,
    true
  );
});

test("applicationCreateSchema validates the tuition id", () => {
  const base = {
    phone: "+8801700000000",
    preferredSchedule: "Sat-Mon, 7-9 PM",
  };
  assert.equal(
    applicationCreateSchema.safeParse({
      ...base,
      tuitionId: "6afe7cac455f5d02d8434b2b",
    }).success,
    true
  );
  assert.equal(
    applicationCreateSchema.safeParse({ ...base, tuitionId: "abc" }).success,
    false
  );
});

test("role and approval schemas only accept known values", () => {
  assert.equal(roleUpdateSchema.safeParse({ role: "admin" }).success, true);
  assert.equal(roleUpdateSchema.safeParse({ role: "owner" }).success, false);
  assert.equal(
    approvalUpdateSchema.safeParse({ approvalStatus: "approved" }).success,
    true
  );
  assert.equal(
    approvalUpdateSchema.safeParse({ approvalStatus: "pending" }).success,
    false
  );
});

test("profileUpdateSchema rejects empty payloads", () => {
  assert.equal(profileUpdateSchema.safeParse({}).success, false);
  assert.equal(
    profileUpdateSchema.safeParse({ bio: "Hello there" }).success,
    true
  );
});

test("checkoutSchema only supports the pro plan", () => {
  assert.equal(checkoutSchema.safeParse({ planName: "pro" }).success, true);
  assert.equal(checkoutSchema.safeParse({}).success, true);
  assert.equal(checkoutSchema.safeParse({ planName: "team" }).success, false);
});
