import { Router } from "express";
import StudentController from "../controllers/StudentController.js";
import { StudentMW } from "../middleware/StudentMW.js";

const router = Router();

// Public Routes
router.post("/student/login", StudentController.studentLogin); // Login route for students
router.post("/student/initiate-verification", StudentController.initiateVerification); // Initiate email verification
router.post("/student/verify-otp", StudentController.verifyOTP); // Verify OTP sent to email
router.post("/student/resend-otp", StudentController.resendOtp); // Resend OTP if needed

// Protected Routes (Require Authentication Middleware)
router.get("/student/check", StudentMW, StudentController.middlewareCheck); // Check if student is authenticated
router.post("/student/upload-id", StudentMW, StudentController.uploadStudentID); // Upload Student ID after verification

export default router;