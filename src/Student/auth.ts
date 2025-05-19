import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Student } from "@prisma/client";

export interface StudentJwtPayload {
  studentId: String;
  role: string;
}
export const generateToken = (student: Student) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be defined");
  }
  const token = jwt.sign(
    {
      userId: student.studentId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  return token;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void  => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be defined");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as StudentJwtPayload;
    req.student = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token." });
  }
};
