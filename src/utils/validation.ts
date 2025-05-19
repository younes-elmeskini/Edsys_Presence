import { z } from "zod";
import { Status } from "@prisma/client";
export default class Validation {
    static createUserSchema = z.object({
        userName: z.string().min(3, { message: "Username must be at least 3 characters long." }),
        email: z.string().email({ message: "Invalid email address." }),
        password: z.string().min(10, { message: "Password must be at least 10 characters long." }),
      });
  static loginSchema = z.object({
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    stay: z.boolean().optional().default(false),
  });
  static resetPasswordSchema = z.object({
    token: z.string({ required_error: "Reset token is required." }),
    newPassword: z.string().min(10, { message: "New password must be at least 10 characters long." }),
  });
  static forgetPasswordSchema = z.object({
    email: z.string().email("Email invalide"),
  });
  static ClientSchema = z.object({
    firstName: z.string().min(3, { message: "First name must be at least 3 characters long." }),
    lastName: z.string().min(3, { message: "Last name must be at least 3 characters long." }),
    email: z.string().email({ message: "Invalid email address." }),
    phone: z.string().min(10, { message: "Phone number must be at least 10 digits long." }),
    educationId: z.string().min(6, { message: "Education ID must be at least 6 characters long." }),
    academicYear: z.string().min(4, { message: "Academic year must be at least 4 characters long." }),
    status: z.enum(Object.values(Status) as [string, ...string[]], { message: "Invalid status value." }),
    title: z.string().min(2, { message: "Title must be at least 2 characters long." }).optional(),
    campany: z.string().min(2, { message: "Company name must be at least 2 characters long." }).optional(),
    position: z.string().min(2, { message: "Position must be at least 2 characters long." }).optional(),
    startYear: z.string().min(4, { message: "Start year must be at least 4 characters long." }).optional(),
    workCity: z.string().min(2, { message: "Work city must be at least 2 characters long." }).optional(),
    city: z.string().min(2, { message: "City must be at least 2 characters long." }).optional(),
    school: z.string().min(2, { message: "School name must be at least 2 characters long." }).optional(),
    furtherEd: z.string().min(2, { message: "Further education must be at least 2 characters long." }).optional(),
    selfEmployed: z.string().min(2, { message: "Self-employed field must be at least 2 characters long." }).optional(),
    duration: z.string().min(1, { message: "Duration is required if provided." }).optional(),
  });
}
