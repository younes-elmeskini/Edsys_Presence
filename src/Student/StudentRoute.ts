import { Router } from "express";
import StudentController from "./StudentController";
import { authenticate } from "./auth";

const router = Router();

router.post("/login", StudentController.login);
router.post("/create", StudentController.createUser);
router.post("/logout", StudentController.logout);
router.post("/:qrcodeId", authenticate, StudentController.checkQrAbsence);
router.post("/absence", authenticate, StudentController.checkCodeAbsence);

router.get("/me", authenticate, StudentController.StudentData);
export default router;
