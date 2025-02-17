import { Router } from "express";
import DiscountController from "../controllers/DiscountController.js";
import { MerchantMW } from "../middleware/MerchantMW.js"; // Import both MerchantMW and AdminMW
import { AdminMW } from "../middleware/AdminMW.js";
import { upload } from "../middleware/fileUpload.js";

const router = Router();

// Public Routes

// Create a new discount (Accessible by Merchants and Admins with specific roles)
router.post(
  "/create-discount",
  [MerchantMW, AdminMW], // Apply both MerchantMW and AdminMW for role-based access
  DiscountController.createDiscount
);

// Upload background image (Accessible by Merchants and Admins with specific roles)
router.post(
  "/submit-background-image/:discountId",
  [MerchantMW, AdminMW], // Apply both MerchantMW and AdminMW for role-based access
  upload.single("image"), // Middleware for file upload
  DiscountController.submitBackgroundImage
);

export default router;