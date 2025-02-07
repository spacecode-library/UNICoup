import { Router } from "express";
import MerchantController from "../controllers/MerchantController.js";

const router = Router();

//public routes
router.post("/login",MerchantController.merchantLogin);


export default router;