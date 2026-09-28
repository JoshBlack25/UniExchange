/*
  Form validation. zod v4, so `z.email()` rather than the removed
  `z.string().email()`.

  The student-email rule mirrors the backend's app.auth.student-email-pattern.
  Both default to 8-10 digits, deliberately loose on length: CPUT publishes no
  student-number digit count anywhere, and a gate one digit too strict silently
  locks real students out. The domain is what is enforced strictly - and the
  emailed code is what actually proves the mailbox exists.
*/

import { z } from "zod";

const DEFAULT_STUDENT_EMAIL_PATTERN = String.raw`^\d{8,10}@mycput\.ac\.za$`;

function studentEmailPattern(): RegExp {
  const configured = import.meta.env.VITE_STUDENT_EMAIL_PATTERN;
  try {
    return new RegExp(configured?.trim() || DEFAULT_STUDENT_EMAIL_PATTERN, "i");
  } catch {
    // A typo in the env var must never open the gate to every address.
    return new RegExp(DEFAULT_STUDENT_EMAIL_PATTERN, "i");
  }
}

const STUDENT_EMAIL = studentEmailPattern();

/*
  CPUT staff sign up with their @cput.ac.za address - any mailbox name. Mirrors
  app.auth.staff-email-pattern. Note "@cput": a student's @mycput.ac.za never
  matches it.
*/
const STAFF_EMAIL = /^[a-z0-9._%+-]+@cput\.ac\.za$/i;

export function isStaffEmail(email: string): boolean {
  return STAFF_EMAIL.test(email.trim());
}

/** A student (@mycput.ac.za) or staff (@cput.ac.za) address. */
export const studentEmailSchema = z
  .string()
  .trim()
  .min(1, "Enter your CPUT email")
  .toLowerCase()
  .refine(
    (email) => STUDENT_EMAIL.test(email) || STAFF_EMAIL.test(email),
    "Use your CPUT email: student number@mycput.ac.za, or your staff @cput.ac.za address",
  );

// Matches the backend's @Size(min = 8) on RegisterRequest.password.
const passwordSchema = z.string().min(8, "Use at least 8 characters");

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name"),
    lastName: z.string().trim().min(1, "Enter your last name"),
    email: studentEmailSchema,
    campusId: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  // Login accepts the address as typed; the backend decides if it is known.
  // Being strict here would block a future faculty or vendor account.
  email: z.string().trim().min(1, "Enter your email").toLowerCase(),
  password: z.string().min(1, "Enter your password"),
  /*
    "Remember me on this device". Plain z.boolean() with a useForm defaultValue
    rather than .default(false): in zod v4 a .default() makes the schema's input
    and output types differ, and zodResolver then infers a LoginValues where the
    field is optional - which quietly turns `values.rememberMe` into
    `boolean | undefined` at every call site.
  */
  rememberMe: z.boolean(),
});

export const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const createListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(150, "Title cannot exceed 150 characters"),
  categoryId: z.string().min(1, "Please select a category"),
  campusId: z.string().min(1, "Please select a campus"),
  price: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine(
      (val) => {
        const n = Number(val);
        return !isNaN(n) && n > 0;
      },
      {
        message: "Please enter a valid positive number",
      },
    ),
  // Neither .optional() nor .default("") here, on purpose. Together they make
  // zod's INPUT type `string | undefined` while z.infer reports the OUTPUT type
  // `string`, and zodResolver types the form from the input - so useForm and
  // handleSubmit disagreed and `npx tsc -b` failed. The field is already given
  // an empty string by the form's defaultValues, so a plain optional-by-content
  // string is both simpler and accurate.
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters"),
});

export const bulletinPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title")
    .max(150, "Keep it under 150 characters"),
  content: z.string().trim().min(1, "Enter what's happening"),
  category: z.enum(["GENERAL", "EVENT", "STUDY_GROUP", "LOST_AND_FOUND"]),
  imageUrl: z
    .union([z.string().trim().url("Enter a valid image URL"), z.literal("")])
    .optional(),
});

/*
  A moderator editing someone's details. Plain strings with a "" default in the
  form, for the same input/output-type reason as createListingSchema above.
  cellPhone mirrors Helper.isValidMobileNumber: 10 to 15 digits, or empty.
*/
export const moderatorUserSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(50, "Keep it under 50 characters"),
  middleName: z.string().trim().max(50, "Keep it under 50 characters"),
  lastName: z.string().trim().min(1, "Enter a last name").max(50, "Keep it under 50 characters"),
  email: studentEmailSchema,
  cellPhone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{10,15}$/.test(value), "Use 10 to 15 digits, or leave it empty"),
  campusId: z.string(),
});

/* Campus announcements, written by moderators. Same limits as a bulletin post. */
export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Enter a title").max(150, "Keep it under 150 characters"),
  content: z.string().trim().min(1, "Write the announcement"),
  category: z.enum(["GENERAL", "EVENT", "STUDY_GROUP", "LOST_AND_FOUND"]),
});

/* Changing your own password - including replacing a moderator's temporary one. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
export type LoginValues = z.infer<typeof loginSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type CreateListingFormData = z.infer<typeof createListingSchema>;
export type BulletinPostValues = z.infer<typeof bulletinPostSchema>;
export type ModeratorUserValues = z.infer<typeof moderatorUserSchema>;
export type AnnouncementValues = z.infer<typeof announcementSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
