// src/utils/userUtils.ts

export interface BaseUser {
  id?: number;
  user_id?: number;
  employee_id?: number;
  emp_id?: number;

  email?: string | null;
  employee_code?: string | number | null;
  is_active?: boolean | number | null;
  status?: string | null;
}


/**
 * Returns unique, active users with valid employee_code.
 * Deduplicates by email (case-insensitive).
 * Priority:
 * 1. Active only
 * 2. Must have employee_code
 * 3. Numeric employee_code preferred
 * 4. Lower ID preferred if tie
 */
export function getUniqueActiveUsers<T extends BaseUser>(
  users: T[]
): T[] {
  const seen = new Map<string, T>();

  for (const user of users) {
    if (!isUserActive(user)) continue;
    if (!hasValidEmployeeCode(user)) continue;

    const emailKey = normalizeEmail(user.email);
    if (!emailKey) continue;

    if (!seen.has(emailKey)) {
      seen.set(emailKey, user);
      continue;
    }

    const existing = seen.get(emailKey)!;

    if (shouldReplace(existing, user)) {
      seen.set(emailKey, user);
    }
  }

  return Array.from(seen.values());
}

/* ---------------------- Helper Functions ---------------------- */

function isUserActive(user: BaseUser): boolean {
  return (
    user.is_active === true ||
    user.is_active === 1 ||
    String(user.status || "").toUpperCase().trim() === "ACTIVE"
  );
}

function hasValidEmployeeCode(user: BaseUser): boolean {
  const code = String(user.employee_code || "").trim();
  return code !== "";
}

function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function isNumericCode(code: string): boolean {
  return /^\d+$/.test(code);
}

function getUserId(user: BaseUser): number {
  return (
    user.id ??
    user.user_id ??
    user.employee_id ??
    user.emp_id ??
    Number.MAX_SAFE_INTEGER
  );
}

function shouldReplace(existing: BaseUser, current: BaseUser): boolean {
  const existingCode = String(existing.employee_code || "").trim();
  const currentCode = String(current.employee_code || "").trim();

  const existingNumeric = /^\d+$/.test(existingCode);
  const currentNumeric = /^\d+$/.test(currentCode);

  if (currentNumeric && !existingNumeric) return true;

  if (
    currentNumeric === existingNumeric &&
    getUserId(current) < getUserId(existing)
  ) {
    return true;
  }

  return false;
}

