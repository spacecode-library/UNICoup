import { Router } from "express";
import AdminController from "../controllers/AdminController.js";
import { AdminMW } from "../middleware/AdminMW.js";

const router = Router();

// Public Routes
router.post("/login", AdminController.adminLogin);

// Protected Routes (Require Admin Middleware)
// router.get("/check", AdminMW, AdminController.middlewareCheck);
router.post("/profile",AdminMW,AdminController.adminProfile);
router.get("/pending-students", AdminMW, AdminController.getPendingStudents);
router.post("/approve-student", AdminMW, AdminController.approveStudent);
router.post("/reject-student", AdminMW, AdminController.rejectStudent);

export default router;