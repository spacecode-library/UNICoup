import { Router } from "express";
import StudentController from "../controllers/StudentController.js";
import { StudentMW } from "../middleware/StudentMW.js";
import { upload } from "../middleware/fileUpload.js";

const router = Router();

// Public Routes
router.post("/login", StudentController.studentLogin); // Login route for students


// Protected Routes (Require Authentication Middleware)
// router.get("/student/check", StudentMW, StudentController.middlewareCheck); // Check if student is authenticated
router.post("/initiate-verification", StudentMW, StudentController.initiateVerification); // Initiate email verification
router.post("/verify-otp", StudentMW, StudentController.verifyOTP); // Verify OTP sent to email
router.post("/resend-otp", StudentMW, StudentController.resendOtp); // Resend OTP if needed
router.post("/upload-id", StudentMW, upload.single('file'),StudentController.uploadStudentID); // Upload Student ID after verification

export default router;