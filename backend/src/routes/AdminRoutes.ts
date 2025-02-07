import { Router } from "express";
import AdminController from "../controllers/AdminController.js";
import { AdminMW } from "../middleware/AdminMW.js";

const router = Router();

//public routes
router.post("/login",AdminController.adminLogin);


//protected routes
router.get("/check",AdminMW,AdminController.middlewareCheck);


export default router;