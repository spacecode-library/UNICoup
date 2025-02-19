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

router.post("/create-tag",AdminMW,AdminController.createTag);
router.get("/tags",AdminMW,AdminController.getAllTags);
router.put("/tag/:id",AdminMW,AdminController.deleteTag);

export default router;