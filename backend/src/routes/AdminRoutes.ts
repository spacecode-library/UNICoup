import { Router } from "express";
import AdminController from "../controllers/AdminController.js";
import { AdminMW } from "../middleware/AdminMW.js";

const router = Router();

// Public Routes
router.post("/admin/login", AdminController.adminLogin);

// Protected Routes (Require Admin Middleware)
router.get("/admin/check", AdminMW, AdminController.middlewareCheck);
router.get("/admin/pending-students", AdminMW, AdminController.getPendingStudents);
router.post("/admin/approve-student", AdminMW, AdminController.approveStudent);
router.post("/admin/reject-student", AdminMW, AdminController.rejectStudent);

export default router;