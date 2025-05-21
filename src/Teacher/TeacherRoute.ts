import { Router } from "express";
import TeacherController from "./TeacherController";
import { authenticate } from "./auth";

const router = Router();

router.post("/login", TeacherController.login);
router.post("/create", TeacherController.createUser);
router.post("/logout", TeacherController.logout);
router.post("/:sessionId/qrcode", authenticate, TeacherController.createQRCode);
router.post("/:sessionId/endsession", authenticate, TeacherController.endSession);

router.get("/me", authenticate, TeacherController.TeacherData);
router.get("/students", TeacherController.getStudents);
router.get("/sessions", authenticate, TeacherController.getSession);
router.get(
  "/",
  authenticate,
  TeacherController.StudentSession
);
router.get("/:qrcodeId", TeacherController.getqrCode);

router.put("/absence/:sessionId/:studentId",authenticate, TeacherController.updateAbsence);

export default router;
