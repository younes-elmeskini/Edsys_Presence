import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Teacher } from "@prisma/client";

export interface TeacherJwtPayload {
  teacherId: String;
}
export const generateToken = (teacher: Teacher) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be defined");
  }
  const token = jwt.sign(
    {
      teacherId: teacher.teacherId,
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
): void => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." });
    return;
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be defined");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as TeacherJwtPayload;
    req.teacher = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token." });
  }
};
