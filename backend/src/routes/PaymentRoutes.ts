import { Router } from "express";
import PaymentController from "../controllers/PaymentController.js";

const router = Router();

router.post("/checkout",PaymentController.checkout)
router.post("/verify",PaymentController.paymentVerification)

export default router;