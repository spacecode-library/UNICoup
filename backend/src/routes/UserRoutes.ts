import { Router } from "express";
import UserController from "../controllers/UserController.js";

const router = Router();


//public routes 
router.post("/register", UserController.userRegistration);
router.post("/resend-otp",UserController.resendOtp);
router.post("/verify-otp",UserController.verifyOtp);
router.post("/refresh-token",UserController.generateToken);



export default router;