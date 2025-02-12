import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MerchantModel from '../models/MerchantModel.js';
import cloudinary from 'cloudinary';
import multer from 'multer';

// Extend the Request type to include the `user` property
interface AuthenticatedRequest extends Request {
    identityId: string;
}

class MerchantController {
    // Step 1: Submit basic information
    static async submitBasicInfo(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { businessname, businessaddress, businessphone, businesswebsite, businessdescription } = req.body;
            const userId = req.identityId;

            // Validate required fields
            if (!businessname || !businessaddress || !businessphone || !businessdescription) {
                return res.status(400).json({ success: false, message: ['All fields are required'] });
            }

            // Check if a merchant record already exists for this user
            const existingMerchant = await MerchantModel.findOne({ userid: userId, isdeleted: false });
            if (existingMerchant) {
                return res.status(400).json({ success: false, message: ['Merchant profile already exists'] });
            }

            // Create a new merchant record with basic information using partial updates
            const newMerchant = await MerchantModel.findOneAndUpdate(
                { userid: userId },
                {
                    $set: {
                        userid: userId,
                        businessname,
                        businessaddress,
                        businessphone,
                        businesswebsite,
                        businessdescription,
                        status: 'pending',
                        isCompletedRegistration: false,
                    },
                },
                { upsert: true, new: true }
            );

            return res.status(201).json({
                success: true,
                message: ['Basic information submitted successfully'],
                data: newMerchant._id,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to submit basic information'] });
        }
    }

    // Step 2: Upload business certificate
    static async uploadBusinessCertificate(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const file = req.file;
            const userId = req.identityId;

            if (!file) {
                return res.status(400).json({ success: false, message: ['No file uploaded'] });
            }

            // Find the merchant by userId
            const merchant = await MerchantModel.findOne({ userid: userId, isdeleted: false });
            if (!merchant) {
                return res.status(404).json({ success: false, message: ['Merchant not found'] });
            }

            // Upload the file to Cloudinary
            const cloudinaryResponse = await cloudinary.v2.uploader.upload(file.path, {
                folder: 'merchant_certificates',
                resource_type: 'auto', // Auto-detect file type (PDF or image)
            });

            // Update the merchant record with the business certificate URL using partial updates
            await MerchantModel.findOneAndUpdate(
                { userid: userId },
                { $set: { BusinessCertificate: cloudinaryResponse.secure_url } },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: ['Business certificate uploaded successfully'],
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Failed to upload business certificate'] });
        }
    }

    // Step 3: Upload business logo
    static async uploadBusinessLogo(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const file = req.file;
            const userId = req.identityId;

            if (!file) {
                return res.status(400).json({ success: false, message: ['No file uploaded'] });
            }

            // Find the merchant by userId
            const merchant = await MerchantModel.findOne({ userid: userId, isdeleted: false });
            if (!merchant) {
                return res.status(404).json({ success: false, message: ['Merchant not found'] });
            }

            // Upload the file to Cloudinary
            const cloudinaryResponse = await cloudinary.v2.uploader.upload(file.path, {
                folder: 'merchant_logos',
                resource_type: 'image',
            });

            // Update the merchant record with the business logo URL and mark registration as complete using partial updates
            await MerchantModel.findOneAndUpdate(
                { userid: userId },
                {
                    $set: {
                        businesslogo: cloudinaryResponse.secure_url,
                        isCompletedRegistration: true,
                    },
                },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: ['Business logo uploaded successfully'],
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Failed to upload business logo'] });
        }
    }
}

export default MerchantController;