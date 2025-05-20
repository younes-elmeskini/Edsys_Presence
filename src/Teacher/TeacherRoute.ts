import { Router } from "express";
import TeacherController from "./TeacherController";
import { authenticate } from "./auth";

const router = Router();

router.post("/login", TeacherController.login);
router.post("/create", TeacherController.createUser);
router.post("/logout", TeacherController.logout);
router.post("/:sessionId/qrcode", authenticate, TeacherController.createQRCode);

router.get("/me", authenticate, TeacherController.TeacherData);
router.get("/",TeacherController.getStudents)
router.get("/sessions", authenticate, TeacherController.getSession);
router.get(
  "/absence/:sessionId",
  authenticate,
  TeacherController.StudentSession
);
router.get("/:qrcodeId", TeacherController.getqrCode);

export default router;
