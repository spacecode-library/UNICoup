import { Router } from "express";
import MerchantController from "../controllers/MerchantController.js";
import { MerchantMW } from "../middleware/MerchantMW.js";
import { uploadmerchantdocs } from "../middleware/merchantfileUpload.js";
const router = Router();

// Login Route
router.post("/login", MerchantController.merchantLogin); // Merchant login

// Protected Routes (Require Merchant Middleware)
router.post("/submit-basic-info", MerchantMW, MerchantController.submitBasicInfo); // Submit basic information
router.post("/upload-certificate", MerchantMW, uploadmerchantdocs.single('file'), MerchantController.uploadBusinessCertificate); // Upload business certificate
router.post("/upload-logo", MerchantMW, uploadmerchantdocs.single('file'), MerchantController.uploadBusinessLogo); // Upload business logo

router.get("/merchant/:status",MerchantMW,MerchantController.merchantStatus);
router.post("/merchant/enter-redemption-code",MerchantMW,MerchantController.enterRedemptionCode);

export default router;
