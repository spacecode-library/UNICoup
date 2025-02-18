import RedemptionModel from '../models/RedemptionModel.js';
import DiscountModel from '../models/DiscountModel.js';
import StudentModel from '../models/StudentModel.js';
import PremiumPricingModel from '../models/PremiumPricingModel.js';
import MerchantPricingModel from "../models/MerchantPricingModel.js"; // Assuming this model holds the fee percentage
import mongoose from 'mongoose';
import crypto from 'crypto';

class RedemptionController {
  // Redeem a Discount
  static async redeemDiscount(req, res) {
    try {
      const { studentId, discountId } = req.body;

      // Validate required fields
      if (!studentId || !discountId) {
        return res.status(400).json({ success: false, message: ['All fields are required'] });
      }

      // Validate student ID and discount ID formats
      if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(discountId)) {
        return res.status(400).json({ success: false, message: ['Invalid studentId or discountId'] });
      }

      // Fetch student data
      const student = await StudentModel.findOne({ _id: studentId, isdeleted: false });
      if (!student || !student.isVerified) {
        return res.status(403).json({ success: false, message: ['Student is not verified'] });
      }


      // Fetch discount data
      const discount = await DiscountModel.findOne({ _id: discountId, isDeleted: false });
      if (!discount) {
        return res.status(404).json({ success: false, message: ['Discount not found'] });
      }
      
      
      const pricing = await PremiumPricingModel.findOne({ }); 

      // Check if student is premium and discount is more than minimum discount
      if(!student.isPremium && (discount.discountpercentage > pricing.discountminium)){
        return res.redirect(301, '/subscription');
      }

      // Check discount availability
      if (discount.status !== 'active' || discount.remainingUses <= 0) {
        return res.status(403).json({ success: false, message: ['Discount is not available'] });
      }

      // Check eligibility criteria
      if (!discount.isOpenAll && !discount.eligibilityCriteria.includes(student.universityDomain)) {   // Discuss with Rahul
        return res.status(403).json({ success: false, message: ['Student does not meet eligibility criteria'] });
      }


    // **Student Redemption Limit Check**
    if (discount.StudentLimit !== undefined && discount.StudentLimit !== null) {
        // Count how many times this student has redeemed this discount
        const studentRedemptionCount = await RedemptionModel.countDocuments({ studentId, discountId });
        if (studentRedemptionCount >= discount.StudentLimit) {
          return res.status(403).json({ success: false, message: ['Student has reached the redemption limit for this discount'] });
        }
      }

      // Generate a unique redemption code
      const redemptionCode = crypto.randomBytes(6).toString('hex').toUpperCase();

      // Create redemption record
      const newRedemption = new RedemptionModel({
        studentId,
        discountId,
        redemptionCode,
        redemptionDate: new Date(),
        isRedeemed: false,
      });

      await newRedemption.save();

      // Update discount's remaining uses
      await DiscountModel.findByIdAndUpdate(discountId, { $inc: { remainingUses: -1 } });

      // Return success response with the discount code
      res.status(200).json({
        success: true,
        message: ['Discount redeemed successfully'],
        data: {
          redemptionCode,
          redemptionDate: newRedemption.redemptionDate,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: ['Unable to redeem discount'] });
    }
  }





  // Get Redemption History for a Student
  static async getRedemptionHistory(req, res) {
    try {
      const { studentId } = req.params;

      // Validate student ID format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ success: false, message: ['Invalid studentId'] });
      }

      // Fetch redemption history
      const redemptions = await RedemptionModel.find({ studentId, isRedeemed: true })
        .populate('discountId', 'title description discountType discountCode')
        .sort({ redemptionDate: -1 });

      res.status(200).json({
        success: true,
        message: ['Redemption history retrieved successfully'],
        data: redemptions,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: ['Unable to fetch redemption history'] });
    }
  }

  static async calculateMerchantFees(req, res) {
    try {
      const { discountId } = req.body;
      if (!discountId) {
        return res.status(400).json({ success: false, message: ['Discount ID is required'] });
      }

      // Fetch discount details
      const discount = await DiscountModel.findById(discountId);
      if (!discount) {
        return res.status(404).json({ success: false, message: ['Discount not found'] });
      }
      const startPrice = discount.startprice;
      if (startPrice === undefined) {
        return res.status(400).json({ success: false, message: ['Discount does not have a start price'] });
      }

      // Count total redemptions for this discount (only count those already redeemed)
      const redemptionCount = await RedemptionModel.countDocuments({ discountId, isRedeemed: true });

      // Retrieve the merchant fee percentage from the single pricing document
      const merchantPricing = await MerchantPricingModel.findOne({});
      if (!merchantPricing) {
        return res.status(404).json({ success: false, message: ['Merchant pricing document not found'] });
      }
      const feePercentage = merchantPricing.allmerchantfee;

      // Calculate total fee (e.g., fee = redemptionCount * startPrice * (feePercentage/100))
      const totalFee = redemptionCount * startPrice * (feePercentage / 100);

      return res.status(200).json({
        success: true,
        message: ['Merchant fees calculated successfully'],
        data: { discountId, redemptionCount, startPrice, feePercentage, totalFee },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Failed to calculate merchant fees'] });
    }
  }

}



export default RedemptionController;