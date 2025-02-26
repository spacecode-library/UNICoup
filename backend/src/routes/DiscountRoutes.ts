import { Router } from "express";
import DiscountController from "../controllers/DiscountController.js";
import { MerchantMW } from "../middleware/MerchantMW.js"; // Import both MerchantMW and AdminMW
import { AdminMW } from "../middleware/AdminMW.js";
import { upload } from "../middleware/fileUpload.js";
import { StudentMW } from "../middleware/StudentMW.js";
import roleBasedMiddleware from "../middleware/RoleBasedMiddleware.js";

const router = Router();

// Public Routes

// Create a new discount (Accessible by Merchants and Admins with specific roles)
router.post(
  "/create",
  [roleBasedMiddleware], // Apply both MerchantMW and AdminMW for role-based access
  DiscountController.createDiscount
);

// Upload background image (Accessible by Merchants and Admins with specific roles)
router.post(
  "/submit-background-image/:discountId",
  [MerchantMW, AdminMW], // Apply both MerchantMW and AdminMW for role-based access
  upload.single("image"), // Middleware for file upload
  DiscountController.submitBackgroundImage
);

router.put("/approve",[AdminMW],DiscountController.ApprovedDiscount)

router.get("/all/:merchantId",[MerchantMW, AdminMW],DiscountController.GetAllDiscountsMerchants)

router.get("/delete/:discountId",[MerchantMW, AdminMW],DiscountController.DeleteDiscount)

// master only routes
router.get("/all/master",AdminMW,DiscountController.GetAllDiscountsMaster);

//student routes.
// Example URL: GET /student-location?city=KualaLumpur&country=Malaysia&pageNumber=1&pageSize=10
router.post("/",StudentMW, DiscountController.GetAllDiscountByStudentLocation);
router.post("/premium",StudentMW, DiscountController.GetAllDiscountByStudentPremiumLocation);


export default router;