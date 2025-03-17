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
router.put("/approve-student", AdminMW, AdminController.approveStudent);
router.put("/reject-student", AdminMW, AdminController.rejectStudent);

router.put("/approve-merchant", AdminMW, AdminController.approveMerchant);
router.put("/reject-merchant", AdminMW, AdminController.rejectMerchant);

router.post("/create-tag",AdminMW,AdminController.createTag);
router.get("/tags",AdminMW,AdminController.getAllTags);
router.put("/tag/:id",AdminMW,AdminController.deleteTag);


router.get("/registered-student",AdminMW,AdminController.studentData);
router.get("/registered-merchant",AdminMW,AdminController.merchantData);
router.get("/merchant/:status",AdminMW,AdminController.merchantDataByStatus);


export default router;