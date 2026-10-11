import test from "node:test";
import assert from "node:assert";
import {
  validateProfile,
  getProfileInitials,
  EMPTY_PROFILE,
} from "../src/lib/profileStore.ts";

test("Consumer Profile Validation & Initials Invariant Tests", async (t) => {
  await t.test("Validates full name requirements", () => {
    // Empty full name should fail validation
    const empty = validateProfile({ ...EMPTY_PROFILE, fullName: "" });
    assert.strictEqual(empty.isValid, false);
    assert.ok(empty.errors.fullName?.includes("required"));

    // Single character name should fail
    const singleChar = validateProfile({ ...EMPTY_PROFILE, fullName: "A" });
    assert.strictEqual(singleChar.isValid, false);
    assert.ok(singleChar.errors.fullName?.includes("at least 2 characters"));

    // Valid name should pass
    const valid = validateProfile({ ...EMPTY_PROFILE, fullName: "K. Raghunath Reddy" });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.errors.fullName, undefined);
  });

  await t.test("Validates email format if provided", () => {
    // Invalid email format should fail
    const invalidEmail = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      email: "invalid-email-address",
    });
    assert.strictEqual(invalidEmail.isValid, false);
    assert.ok(invalidEmail.errors.email?.includes("valid email"));

    // Valid email should pass
    const validEmail = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      email: "raghunath.reddy@example.com",
    });
    assert.strictEqual(validEmail.isValid, true);
    assert.strictEqual(validEmail.errors.email, undefined);

    // Empty email is optional and should pass
    const emptyEmail = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      email: "",
    });
    assert.strictEqual(emptyEmail.isValid, true);
  });

  await t.test("Validates phone format if provided", () => {
    // Non-10-digit phone should fail
    const shortPhone = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      phone: "12345",
    });
    assert.strictEqual(shortPhone.isValid, false);
    assert.ok(shortPhone.errors.phone?.includes("10-digit"));

    // Phone starting with invalid digit should fail
    const invalidStart = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      phone: "1234567890",
    });
    assert.strictEqual(invalidStart.isValid, false);

    // Valid 10-digit Indian mobile number should pass
    const validPhone = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      phone: "9848012345",
    });
    assert.strictEqual(validPhone.isValid, true);
    assert.strictEqual(validPhone.errors.phone, undefined);
  });

  await t.test("Validates service number length if provided", () => {
    const shortService = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      serviceNumber: "12",
    });
    assert.strictEqual(shortService.isValid, false);
    assert.ok(shortService.errors.serviceNumber?.includes("at least 3 characters"));

    const validService = validateProfile({
      ...EMPTY_PROFILE,
      fullName: "Raghunath Reddy",
      serviceNumber: "NEL-04-12948",
    });
    assert.strictEqual(validService.isValid, true);
  });

  await t.test("Generates uppercase avatar initials accurately", () => {
    assert.strictEqual(getProfileInitials(""), "CP");
    assert.strictEqual(getProfileInitials(undefined), "CP");
    assert.strictEqual(getProfileInitials("Prashanth"), "PR");
    assert.strictEqual(getProfileInitials("K. Raghunath Reddy"), "KR");
    assert.strictEqual(getProfileInitials("Ramesh Kumar Sharma"), "RS");
    assert.strictEqual(getProfileInitials("Venkat"), "VE");
  });

  await t.test("Profile structure does not contain passwords or secrets", () => {
    const keys = Object.keys(EMPTY_PROFILE);
    assert.strictEqual(keys.includes("password"), false);
    assert.strictEqual(keys.includes("apiKey"), false);
    assert.strictEqual(keys.includes("secret"), false);
    assert.strictEqual(keys.includes("token"), false);
  });
});
