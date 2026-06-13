import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

// Register validation schema
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    agreeToTerms: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must agree to the terms and conditions"
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Card data is never handled in the app — Stripe Elements collects it directly.
// Do not add card number, CVV, or expiry fields to any schema here.

// User profile update schema
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

// Full profile form schema (Profile page). Optional fields accept empty strings.
export const profileFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number must be 20 characters or fewer")
    .optional()
    .or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(1000, "Bio must be 1,000 characters or fewer")
    .optional()
    .or(z.literal("")),
  investmentGoals: z
    .string()
    .trim()
    .max(1000, "Investment goals must be 1,000 characters or fewer")
    .optional()
    .or(z.literal("")),
});

// Admin user management schema
export const adminUserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  role: z.enum(["user", "admin"], {
    required_error: "Role is required",
  }),
  subscription: z.enum(["basic", "premium", "enterprise"], {
    required_error: "Subscription plan is required",
  }),
  isActive: z.boolean(),
});

// Billing schema — plan selection only. Card data is handled by Stripe Elements.
export const billingSchema = z.object({
  plan: z.enum(["basic", "premium", "enterprise"], {
    required_error: "Please select a plan",
  }),
  billingCycle: z.enum(["monthly", "yearly"], {
    required_error: "Please select a billing cycle",
  }),
});

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .min(6, "Password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

// Contact/Support form schema
export const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .min(5, "Subject must be at least 5 characters"),
  message: z
    .string()
    .min(1, "Message is required")
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
  priority: z.enum(["low", "medium", "high"], {
    required_error: "Please select a priority level",
  }),
});

export default {
  loginSchema,
  registerSchema,
  profileUpdateSchema,
  profileFormSchema,
  adminUserSchema,
  billingSchema,
  changePasswordSchema,
  contactSchema,
};
