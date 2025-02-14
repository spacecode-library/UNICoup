import DiscountModel from '../models/DiscountModel.js';
import cloudinary from 'cloudinary';
import mongoose from 'mongoose';
import { UserRoleEnums, AdminRoleEnums } from '../constants/EnumTypes.js';

class DiscountController {
  // 1. Create Discount
  static async createDiscount(req, res) {
    try {
      const {
        title,
        description,
        totalUses,
        StudentLimit,
        eligibilityCriteria,
        discountType,
        endDate,
        discountCode,
        storeLink,
        tags,
        isOpenAll,
        merchantCity,
        merchantCountry,
      } = req.body;

      // Validate required fields
      if (
        !title ||
        !description ||
        !totalUses ||
        !discountType ||
        !endDate ||
        !tags ||
        !merchantCity ||
        !merchantCountry
      ) {
        return res.status(400).json({ success: false, message: ['All fields are required'] });
      }

      // Validate discount type
      if (!['Online', 'Offline'].includes(discountType)) {
        return res.status(400).json({ success: false, message: ['Invalid discount type'] });
      }

      // Validate tags (ensure exactly 3 tags are provided)
      if (!Array.isArray(tags) || tags.length !== 3) {
        return res.status(400).json({ success: false, message: ['Exactly 3 tags are required'] });
      }

      // Check user role and permissions
      const { role, adminRole, identityId } = req;

      if (role === UserRoleEnums.Merchant) {
        // Merchant can only submit a discount for review
        const newDiscount = new DiscountModel({
          merchantId: identityId,
          merchantCity,
          merchantCountry,
          title,
          description,
          discountType,
          discountCode,
          storeLink,
          totalUses,
          StudentLimit,
          remainingUses: totalUses,
          startDate: new Date(),
          endDate: new Date(endDate),
          eligibilityCriteria,
          isOpenAll,
          tags,
          status: 'created', // Initial status for merchant-submitted discounts
          isApproved: false, // Discounts submitted by merchants require admin approval
        });

        await newDiscount.save();
        return res.status(201).json({
          success: true,
          message: ['Discount submitted for review successfully'],
          data: newDiscount,
        });
      } else if (
        role === UserRoleEnums.Admin &&
        (adminRole === AdminRoleEnums.DiscountManager || adminRole === UserRoleEnums.Master)
      ) {
        // Admin with DiscountManager or Master role can directly create an approved discount
        const newDiscount = new DiscountModel({
          merchantId: identityId,
          merchantCity,
          merchantCountry,
          title,
          description,
          discountType,
          discountCode,
          storeLink,
          totalUses,
          StudentLimit,
          remainingUses: totalUses,
          startDate: new Date(),
          endDate: new Date(endDate),
          eligibilityCriteria,
          isOpenAll,
          tags,
          status: 'active', // Directly active for admin-created discounts
          isApproved: true, // Admin-created discounts are auto-approved
        });

        await newDiscount.save();
        return res.status(201).json({
          success: true,
          message: ['Discount created successfully'],
          data: newDiscount,
        });
      } else {
        // Unauthorized role
        return res.status(403).json({ success: false, message: ['Permission denied'] });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: ['Unable to create discount'] });
    }
  }

  // 2. Submit Background Image
  static async submitBackgroundImage(req, res) {
    try {
      const { discountId } = req.params;
      const file = req.file;

      // Validate discount ID
      if (!mongoose.Types.ObjectId.isValid(discountId)) {
        return res.status(400).json({ success: false, message: ['Invalid discount ID'] });
      }

      // Validate file upload
      if (!file) {
        return res.status(400).json({ success: false, message: ['No file uploaded'] });
      }

      // Upload image to Cloudinary
      const cloudinaryResponse = await cloudinary.v2.uploader.upload(file.path, {
        folder: 'discount_backgrounds',
        resource_type: 'image',
      });

      // Update discount with background image URL
      const updatedDiscount = await DiscountModel.findByIdAndUpdate(
        discountId,
        { $set: { backgroundImage: cloudinaryResponse.secure_url } },
        { new: true }
      );

      if (!updatedDiscount) {
        return res.status(404).json({ success: false, message: ['Discount not found'] });
      }

      res.status(200).json({ success: true, message: ['Background image uploaded successfully'] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: ['Unable to upload background image'] });
    }
  }
}

export default DiscountController;