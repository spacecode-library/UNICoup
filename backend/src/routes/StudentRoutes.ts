import { Router } from "express";
import StudentController from "../controllers/StudentController.js";
import { StudentMW } from "../middleware/StudentMW.js";

const router = Router();

//public routes
router.post("/login",StudentController.studentLogin);

//protected routes
router.get("/check",StudentMW,StudentController.middlewareCheck);

export default router;