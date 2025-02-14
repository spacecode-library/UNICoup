import { Router } from 'express';
import RedemptionController from '../controllers/RedemptionController.js';
import { StudentMW } from '../middleware/StudentMW.js'; // Middleware for student authentication

const router = Router();

// Redeem a discount (Accessible by students)
router.post('/redeem-discount', StudentMW, RedemptionController.redeemDiscount);

// Get redemption history for a student
router.get('/redemption-history/:studentId', StudentMW, RedemptionController.getRedemptionHistory);

export default router;