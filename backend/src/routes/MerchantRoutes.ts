import { Router } from "express";
import MerchantController from "../controllers/MerchantController.js";
import { MerchantMW } from "../middleware/MerchantMW.js";
import { upload } from "../middleware/fileUpload.js";

const router = Router();

// Protected Routes (Require Merchant Middleware)
router.post("/submit-basic-info", MerchantMW, MerchantController.submitBasicInfo); // Submit basic information
router.post("/upload-certificate", MerchantMW, upload.single('file'), MerchantController.uploadBusinessCertificate); // Upload business certificate
router.post("/upload-logo", MerchantMW, upload.single('file'), MerchantController.uploadBusinessLogo); // Upload business logo

export default router;