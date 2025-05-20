import { Request, Response } from "express";
import prisma from "../utils/client";
import { z } from "zod";
import * as argon2 from "argon2";
import { Teacher } from "@prisma/client";
import { generateToken } from "./auth";
import Validation from "../utils/validation";
import QRCode from "qrcode";
import cloudinary from "../utils/cloudinary";
import path from "path";
import fs from "fs/promises";
import os from "os";

type CreateUserInput = z.infer<typeof Validation.createUserSchema>;

type LoginUserInput = z.infer<typeof Validation.loginSchema>;

export default class TeacherController {
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
      const userExists = await prisma.teacher.findUnique({
        where: { email: parsedData.email },
      });
      if (userExists) {
        res.status(409).json({ message: "User already exists" });
        return;
      }
      const hashedPassword: string = await argon2.hash(parsedData.password);
      const teacher: Teacher = await prisma.teacher.create({
        data: {
          lastName: parsedData.lastName,
          FirstName: parsedData.firstName,
          email: parsedData.email,
          password: hashedPassword,
        },
      });
      res.status(201).json(teacher);
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
      const teacher = await prisma.teacher.findUnique({
        where: { email: parsedData.email },
      });

      if (!teacher) {
        res.status(404).json({ message: "Invalid email" });
        return;
      }

      const isPasswordValid: boolean = await argon2.verify(
        teacher.password!,
        parsedData.password
      );
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }
      const token = generateToken(teacher);
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
          userId: teacher.teacherId,
          email: teacher.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  }
  static async TeacherData(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.teacher?.teacherId;
      if (!teacherId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const teacher = await prisma.teacher.findUnique({
        where: { teacherId: teacherId.toString() },
        select: {
          teacherId: true,
          FirstName: true,
          lastName: true,
          email: true,
          profilImage: true,
        },
      });
      if (!teacher) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(200).json({ data: teacher });
    } catch (error) {
      console.error("Error fetching Teacher data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
  static async logout(req: Request, res: Response) {
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  }
  static async createQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const teacherId = req.teacher?.teacherId;
      if (!teacherId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const session = await prisma.session.findUnique({ where: { sessionId } });
      if (!session) {
        res.status(404).json({ message: "Session not found" });
        return;
      }
      let code: string;
      let existingCode;
      do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        existingCode = await prisma.qRcode.findUnique({
          where: { code },
        });
      } while (existingCode);

      const savedQR = await prisma.qRcode.create({
        data: {
          code: code,
          expiredAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // expire dans 3h
          session: { connect: { sessionId } },
        },
      });

      const frontendUrl = `https://www.joinspots.com`;

      const tempPath = path.join(os.tmpdir(), `${code}.png`);
      await QRCode.toFile(tempPath, frontendUrl);

      const result = await cloudinary.uploader.upload(tempPath, {
        folder: "qrcodes",
        public_id: `${code}_${sessionId}`,
        use_filename: true,
      });

      // Sauvegarde dans la base de données
      const finalsavedQR = await prisma.qRcode.update({
        where: {
          qrcodeId: savedQR.qrcodeId,
        },
        data: {
          qrImage: result.secure_url,
        },
      });

      res.status(201).json({
        message: "QR Code created and uploaded",
        qrCode: finalsavedQR,
        url: result.secure_url,
      });
    } catch (error) {
      console.error("QR Code creation error:", error);
      res.status(500).json({ message: "Failed to create QR Code" });
    }
  }
  static async getqrCode(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.teacher?.teacherId;
      if (!teacherId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { qrcodeId } = req.params;
      const qrcode = await prisma.qRcode.findUnique({
        where: {
          qrcodeId,
        },
      });
      if (!qrcode) {
        res.status(404).json({ message: "QR code not fond" });
        return;
      }
      const publicId = `qrcodes/${qrcode.code}`;

      const qrcodeImage = await cloudinary.api.resource(publicId, {
        type: "upload",
        resource_type: "image",
      });

      res.status(200).json({
        message: "QR code found",
        data: {
          code: qrcode.code,
          qrImage: qrcodeImage.secure_url,
          expiredAt: qrcode.expiredAt,
        },
      });
    } catch (error) {
      console.error("QR Code found error:", error);
      res.status(500).json({ message: "Failed to found QR Code", error });
    }
  };
  static async getSession(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.teacher?.teacherId;
      if (!teacherId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const sessions = await prisma.session.findMany({
        select: {
          sessionId: true,
          title: true,
        },
      });
      if (sessions.length === 0) {
        res.status(404).json({ message: "No sessions found" });
        return;
      }
      res.status(200).json({ message: "Sessions found", data: sessions });
    } catch (error) {
      console.error("Sessions found error:", error);
      res.status(500).json({ message: "Failed to found Sessions" });
    }
  }
  static async StudentSession(req: Request, res: Response): Promise<void> {
    try {
      const teacherId = req.teacher?.teacherId;
      if (!teacherId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { sessionId } = req.params;
      const students = await prisma.studentAbsence.findMany({
        where: {
          sessionId: sessionId,
        },
        select: {
          student: {
            select: {
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
          isAbsent: true,
          isLate: true,
          isPresnet: true,
        },
      });
      if (students.length === 0) {
        res.status(404).json({ message: "No students found for this session" });
        return;
      }
      res.status(200).json({ message: "Students found", data: students });
    } catch (error) {
      console.error("Students found error:", error);
      res.status(500).json({ message: "Failed to found Students" });
    }
  }
static async getStudents(req: Request, res: Response): Promise<void> {
  try {
    const students = await prisma.student.findMany({
      select: {
        studentId: true,
        firstName: true,
        lastName: true,
        email: true,
        profilImage: true,
      },
    });
    if (students.length === 0) {
      res.status(404).json({ message: "No students found" });
      return;
    }
    res.status(200).json({ message: "Students found", data: students });
  } catch (error) {
    console.error("Students found error:", error);
    res.status(500).json({ message: "Failed to found Students" });
  }
}
}
