import { Request, Response } from "express";
import prisma from "../utils/client";
import { z } from "zod";
import * as argon2 from "argon2";
import { Student } from "@prisma/client";
import { generateToken } from "./auth";
import Validation from "../utils/validation";

type CreateUserInput = z.infer<typeof Validation.createUserSchema>;

type LoginUserInput = z.infer<typeof Validation.loginSchema>;

export default class UserController {
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = Validation.createUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.errors[0]?.message || "Validation error.";
        res.status(400).json({ message: firstError });
        return;
      }
      const parsedData: CreateUserInput = Validation.createUserSchema.parse(
        req.body
      );
      const userExists = await prisma.student.findUnique({
        where: { email: parsedData.email },
      });
      if (userExists) {
        res.status(409).json({ message: "User already exists" });
        return;
      }
      const hashedPassword: string = await argon2.hash(parsedData.password);
      const student: Student = await prisma.student.create({
        data: {
          lastName: parsedData.lastName,
          firstName: parsedData.firstName,
          email: parsedData.email,
          password: hashedPassword,
        },
      });
      res.status(201).json(student);
    } catch (error) {
      res.status(500).json({ message: "Authentication failed" });
    }
  }
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = Validation.loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        const firstError =
          validationResult.error.errors[0]?.message || "Validation error.";
        res.status(400).json({ message: firstError });
        return;
      }
      const parsedData: LoginUserInput = Validation.loginSchema.parse(req.body);
      const student = await prisma.student.findFirst({
        where: { email: parsedData.email },
      });

      if (!student) {
        res.status(404).json({ message: "Invalid email" });
        return;
      }

      const isPasswordValid: boolean = await argon2.verify(
        student.password!,
        parsedData.password
      );
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = generateToken(student);
      if (!token) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.status(200).json({
        message: "Login successful",
        user: {
          userId: student.studentId,
          email: student.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  }
  static async StudentData(req: Request, res: Response): Promise<void> {
    try {
      const studentId = req.student?.studentId;
      if (!studentId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const student = await prisma.teacher.findUnique({
        where: { teacherId: studentId.toString() },
        select: {
          teacherId: true,
          FirstName: true,
          lastName: true,
          email: true,
          profilImage: true,
        },
      });
      if (!student) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(200).json({ data: student });
    } catch (error) {}
  }
  static async logout(req: Request, res: Response) {
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  }
}
