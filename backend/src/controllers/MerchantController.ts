import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MerchantModel from '../models/MerchantModel.js';
import cloudinary from 'cloudinary';
import multer from 'multer';
import UserModel from '../models/UserModel.js';
import AuthModel from '../models/Authmodel.js';
import { generateAccessToken, generateRefreshToken } from '../utils/Jwt.js';
import bcrypt from 'bcrypt';

// Extend the Request type to include the `user` property
interface AuthenticatedRequest extends Request {
    identityId: string;
}

class MerchantController {


        //merchant login...
        static async merchantLogin(req: Request, res: Response): Promise<any> {
            try {
                let { email, password, role } = req.body;
    
                const getMerchantData = await UserModel.findOne(
                    { email: email, isdeleted: false },
                    { password: 1, role: 1 }
                )
    
                if(getMerchantData === null || getMerchantData.role !== role ){
                    return res.status(400).json({ success: false, message: ["Invalid Email or Password"] ,data:{}});
                }
    
                const isMatch = await bcrypt.compare(password, getMerchantData.password);
    
                if (!isMatch) {
                    return res.status(400).json({ success: false, message: ["Invalid Email or Password"] ,data:{}});
                }
    
                const authTokenId = new mongoose.Types.ObjectId().toString();
    
                const payload = {
                    authId: authTokenId,
                    identityId: getMerchantData.id,
                }
    
                let newDate = new Date();
    
                const tokenExpiredAt = 60 * 60;
                const accessToken = await generateAccessToken(payload, tokenExpiredAt);
    
                const refreshTokenExpiredAt = 60 * 60 * 24 * 20;
                const refreshToken = await generateRefreshToken(payload, refreshTokenExpiredAt);
    
                const tokenData = new AuthModel();
                tokenData._id = authTokenId;
                tokenData.identityid = getMerchantData.id;
                tokenData.token = accessToken;
                tokenData.tokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60);
                tokenData.refreshToken = refreshToken;
                tokenData.refreshTokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 20);
    
                await new AuthModel(tokenData).save();
    
                return res.status(200).json({
                    message: ['Merchant Login Successfully.'],
                    succeeded: true,
                    data: {
                        identityId: getMerchantData.id,
                        token: accessToken,
                        tokenExpiredAt: newDate.setSeconds(tokenExpiredAt),
                        refreshToken: refreshToken,
                        refreshTokenExpiredAt: newDate.setSeconds(refreshTokenExpiredAt),
                    }
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ success: false, message: ["Unable to Login, please try again later"] });
            }
        }    

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