import { z } from "zod";

// Allowed values mirror the CHECK constraints on public.users in
// 001_initial_schema.sql. Keep in sync if those constraints change.
export const USER_ROLES = ["user", "moderator", "admin"];
// 'deleted' is a valid DB status but is never set from the admin UI (deletion
// is a separate, deliberate flow), so it is excluded from the editable set.
export const USER_STATUSES = ["active", "inactive", "suspended"];

// Whitelist for admin edits to another user's public.users row. `.strict()`
// rejects any unexpected key so a caller can never smuggle arbitrary columns
// (e.g. failed_login_attempts, locked_until) into the update. At least one of
// role/status must be present.
export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .strict()
  .refine((data) => data.role !== undefined || data.status !== undefined, {
    message: "No valid fields to update.",
  });

// Parse-or-throw helper with a friendly message for the admin UI.
export function validateAdminUserUpdate(updates) {
  const result = adminUserUpdateSchema.safeParse(updates);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(first?.message || "Invalid user update.");
  }
  return result.data;
}
