import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MerchantModel from '../models/MerchantModel.js';
import cloudinary from 'cloudinary';
import multer from 'multer';
import UserModel from '../models/UserModel.js';
import AuthModel from '../models/Authmodel.js';
import { generateAccessToken, generateRefreshToken } from '../utils/Jwt.js';
import bcrypt from 'bcrypt';
import RedemptionModel from '../models/RedemptionModel.js';
import DiscountModel from '../models/DiscountModel.js';
import { MerchantStatusEnums, UserRoleEnums } from '../constants/EnumTypes.js';

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
                    role:UserRoleEnums.Merchant
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
            const { businessname, businessaddress, businessphone, businesswebsite, businessdescription,businesscity,businessstate,businesscountry } = req.body;
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
                        businesscity,
                        businessstate,
                        businesscountry,
                        businessphone,
                        businesswebsite,
                        businessdescription,
                        status: MerchantStatusEnums.Pending,
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
    
            // Upload the file to Cloudinary with proper folder and resource type
            const cloudinaryResponse = await cloudinary.v2.uploader.upload(file.path, {
                folder: 'merchant_certificates', // Ensure folder is set as desired
                resource_type: 'auto', // Auto-detect file type (PDF or image)
            });
    
            // console.log(cloudinaryResponse, "response from cloudinary");
    
            // Update the merchant record with the business certificate URL from Cloudinary
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
            return res.status(500).json({ success: false, message: ['Failed to upload business certificate'] });
        }
    }


    static async enterRedemptionCode(req:AuthenticatedRequest, res:Response):Promise<any> {
        try {
          const { redemptionCode } = req.body;
          const merchantId = req.identityId; // from the authenticated request
          if (!redemptionCode) {
            return res.status(400).json({ success: false, message: ['Redemption code is required'] });
          }
    
          // Look up the redemption document by redemption code
          const redemption = await RedemptionModel.findOne({ redemptionCode });
          if (!redemption) {
            return res.status(404).json({ success: false, message: ['Redemption code not found'] });
          }
    
          // Retrieve the discount linked to this redemption
          const discount = await DiscountModel.findById(redemption.discountId);
          if (!discount) {
            return res.status(404).json({ success: false, message: ['Discount not found for this redemption'] });
          }
    
          // Verify that the discount belongs to the merchant entering the code
          if (discount.merchantId !== merchantId) {
            return res.status(403).json({ success: false, message: ['Merchant not authorized for this redemption'] });
          }
    
          // Ensure the redemption has not already been processed
          if (redemption.isRedeemed) {
            return res.status(400).json({ success: false, message: ['Redemption code has already been used'] });
          }
    
          // Mark the redemption as redeemed
          redemption.isRedeemed = true;
          await redemption.save();
    
          return res.status(200).json({
            success: true,
            message: ['Redemption code validated and redemption completed'],
            data: redemption,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ success: false, message: ['Failed to process redemption code'] });
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


    static async merchantStatus(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const merchantId = req.identityId;

            const merchantData = await MerchantModel.findOne(
                {userid:merchantId,isdeleted:false},
                {_id:1,status:1,isVerifed:1,isCompletedRegistration:1, businessaddress:1, businesscity:1, businesscountry:1, businessdescription:1, businessname:1, businessphone:1, businessstate:1, businesswebsite:1, BusinessCertificate:1, businesslogo:1}
            )

            if(!merchantData){
                return res.status(404).json({ success: false, message: ['Merchant not found'] });
            }

            return res.status(200).json(
                {
                    success: true,
                    data:merchantData,
                    message: ['Merchant data found successfully'],
                }
            )
            
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to found data,Please try again later'] });
        }
    }

    static async getDiscountStats(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const merchantId = req.identityId;
    
            // 1. Retrieve discounts for the given merchant
            const discountData = await DiscountModel.find(
                { merchantId: merchantId, isDeleted: false },
                { _id: 1, totalUses: 1, startprice: 1, discountpercentage: 1 }
            );
    
            if (!discountData || discountData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: ['Discount data not found']
                });
            }
    
            // Create an array of discount IDs for later queries
            const discountIds = discountData.map(item => item._id);
    
            // Initialize variables for aggregations
            let totalUses = 0;
            let totalRevenue = 0;
            let discountPercentageSum = 0;
            let countDiscountPercentage = 0;
            let startPriceSum = 0;
            let countStartPrice = 0;
    
            discountData.forEach(item => {
                const uses = item.totalUses || 0;
                totalUses += uses;
    
                const price = item.startprice || 0;
                totalRevenue += uses * price;
    
                if (item.discountpercentage !== undefined && item.discountpercentage !== null) {
                    discountPercentageSum += item.discountpercentage;
                    countDiscountPercentage++;
                }
    
                if (item.startprice !== undefined && item.startprice !== null) {
                    startPriceSum += item.startprice;
                    countStartPrice++;
                }
            });
    
            // 2. Get redemption counts
            // Total redemptions
            const totalRedemption = await RedemptionModel.countDocuments({
                discountId: { $in: discountIds },
                isRedeemed: true
            });
    
            // Redemptions in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
            const lastThirtyDaysRedemption = await RedemptionModel.countDocuments({
                discountId: { $in: discountIds },
                isRedeemed: true,
                redemptionDate: { $gte: thirtyDaysAgo }
            });
    
            // 3. Calculate Conversion Rate (if total uses is not zero)
            let conversionRate = 0;
            if (totalUses > 0) {
                conversionRate = Math.round((totalRedemption / totalUses) * 100);
            } else {
                return res.status(400).json({
                    success: false,
                    message: ['Total uses is zero, cannot calculate conversion rate']
                });
            }
    
            // 4. Calculate Remaining Uses
            const remainingUses = totalUses - totalRedemption;
    
            // 5. Calculate average discount percentage and average starting price
            const averageDiscountPercentage =
                countDiscountPercentage > 0
                    ? parseFloat((discountPercentageSum / countDiscountPercentage).toFixed(2))
                    : 0;
            const averageStartingPrice =
                countStartPrice > 0
                    ? parseFloat((startPriceSum / countStartPrice).toFixed(2))
                    : 0;
    
            // 6. Return the aggregated data
            return res.status(200).json({
                success: true,
                data: {
                    totalRedemption,
                    lastThirtyDaysRedemption,
                    conversionRate,
                    totalRevenue,
                    remainingUses,
                    averageDiscountPercentage,
                    averageStartingPrice
                },
                message: ['Discount statistics data found successfully.']
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: ['Unable to fetch data, please try again later.']
            });
        }
    }

    static async topDiscount(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const merchantId = req.identityId;
    
            const topDiscounts = await DiscountModel.aggregate([
                { 
                    $match: { 
                        merchantId: merchantId, 
                        isDeleted: false 
                    } 
                },
                {
                    $lookup: {
                        from: "redemptions",
                        let: { discountId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$discountId", "$$discountId"] },
                                            { $eq: ["$isRedeemed", true] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "redemptions"
                    }
                },
                {
                    $addFields: {
                        redemptionCount: { $size: "$redemptions" }
                    }
                },
                { $sort: { redemptionCount: -1 } },
                { $limit: 3 },
                {
                    $project: {
                        title: 1,
                        description: 1,
                        _id: 0
                    }
                }
            ]);
    
            if (!topDiscounts || topDiscounts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: ['No top discount data found']
                });
            }
    
            return res.status(200).json({
                success: true,
                data: topDiscounts,
                message: ['Top discount data fetched successfully']
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                message: ['Unable to fetch data, please try again later.']
            });
        }
    }    
    

    


}

export default MerchantController;
