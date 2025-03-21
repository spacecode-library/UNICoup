import DiscountModel from '../models/DiscountModel.js';
import cloudinary from 'cloudinary';
import mongoose from 'mongoose';
import { UserRoleEnums, AdminRoleEnums, DiscountStatusEnums, DiscountTypeEnums } from '../constants/EnumTypes.js';
import { Request, Response } from 'express';
import StudentModel from '../models/StudentModel.js';
import PremiumPricingModel from '../models/PremiumPricingModel.js';
import MerchantModel from '../models/MerchantModel.js';


// Extend the Request type to include the `user` property
interface AuthenticatedRequest extends Request {
  identityId: string;
  role: string;
  adminRole: string;
}


class DiscountController {
  // 1. Create Discount
  static async createDiscount(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const {
        title,
        description,
        totalUses,
        StudentLimit,
        eligibilityCriteria,
        discountType,
        endDate,
        startprice,
        discountpercentage,
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
        !endDate 
        // !tags ||
        // !merchantCity ||
        // !merchantCountry
      ) {
        return res.status(400).json({ success: false, message: ['All fields are required'] });
      }

      // Validate discount type
      // if (!DiscountTypeEnums.includes(discountType)) {
      //   return res.status(400).json({ success: false, message: ['Invalid discount type'] });
      // }

      // Validate tags (ensure exactly 3 tags are provided)
      // if (!Array.isArray(tags) || tags.length !== 3) {
      //   return res.status(400).json({ success: false, message: ['Exactly 3 tags are required'] });
      // }

      // Check user role and permissions
      const { role, adminRole, identityId } = req;

      if (role === UserRoleEnums.Merchant) {
        const merchant = await MerchantModel.findOne(
          {userid:identityId},
          {businesscity:1,businesscountry:1}
        );
      
        // Merchant can only submit a discount for review
        const newDiscount = new DiscountModel({
          merchantId: identityId,
          merchantCity:merchant.businesscity,
          merchantCountry:merchant.businesscountry,
          title,
          description,
          discountType,
          startprice,
          discountpercentage,
          storeLink,
          totalUses,
          StudentLimit,
          remainingUses: totalUses,
          startDate: new Date(),
          endDate: new Date(endDate),
          eligibilityCriteria,
          isOpenAll,
          tags,
          status: DiscountStatusEnums.Created, // Initial status for merchant-submitted discounts
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
        (adminRole === AdminRoleEnums.DiscountManager || adminRole === AdminRoleEnums.Master)
      ) {
        // Admin with DiscountManager or Master role can directly create an approved discount
        const newDiscount = new DiscountModel({
          merchantId: identityId,
          merchantCity,
          merchantCountry,
          title,
          description,
          discountType,
          startprice,
          discountpercentage,
          storeLink,
          totalUses,
          StudentLimit,
          remainingUses: totalUses,
          startDate: new Date(),
          endDate: new Date(endDate),
          eligibilityCriteria,
          isOpenAll,
          tags,
          status: DiscountStatusEnums.Active, // Directly active for admin-created discounts
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
      return res.status(500).json({ success: false, message: ['Unable to create discount'] });
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

      return res.status(200).json({ success: true, message: ['Background image uploaded successfully'] });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to upload background image'] });
    }
  }

  
  static async ApprovedDiscount(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { discountId, adminId, isApproved } = req.body;
      console.log(discountId)
      const getDiscountData = await DiscountModel.findOne(
        { _id: discountId, isDeleted: false, isApproved: false },
        { isApproved: 1 }
      )

      if (!getDiscountData) {
        return res.status(404).json({ success: false, message: ['Data not found.'] })
      }
      console.log(getDiscountData)
      // Check user role and permissions
      const { role, adminRole, identityId } = req;

      if (role !== UserRoleEnums.Admin || (adminRole !== AdminRoleEnums.DiscountManager && adminRole !== AdminRoleEnums.Master)) {
        res.status(403).json({ success: false, message: ['Permission Denied!!.'] })
      }

      const discount = await DiscountModel.findByIdAndUpdate(
        getDiscountData._id,
        { $set: { adminId: identityId, isApproved: true } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: ['Discount Approved Successfully.'],
        data: {
          discountId: getDiscountData._id
        }
      })
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to Approved Discount, Please try again.'] });
    }
  }

  static async RejectDiscount(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { discountId, adminId, isApproved } = req.body;

      const getDiscountData = await DiscountModel.findOne(
        { _id: discountId, isDeleted: false, isApproved: true },
        { isApproved: 1 }
      )
      if (!getDiscountData) {
        res.status(404).json({ success: false, message: ['Data not found.'] })
      }

      // Check user role and permissions
      const { role, adminRole, identityId } = req;

      if (role !== UserRoleEnums.Admin || (adminRole !== AdminRoleEnums.DiscountManager && adminRole !== AdminRoleEnums.Master)) {
        res.status(403).json({ success: false, message: ['Permission Denied!!.'] })
      }

      const discount = await DiscountModel.findByIdAndUpdate(
        getDiscountData._id,
        { $set: { adminId: identityId, isApproved: false } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: ['Discount Rejected Successfully.'],
        data: {
          discountId: getDiscountData._id
        }
      })
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to Reject Discount, Please try again.'] });
    }
  }

  static async DeleteDiscount(req:AuthenticatedRequest,res:Response):Promise<any>{
    try {
      const {discountId} = req.params;
      if(!discountId){
        return res.status(400).json({ success: false, message: ['All fields are required'] });
      }

      const getDiscountData = await DiscountModel.findOne(
        {_id:discountId,isDeleted:false},
        {_id:1}
      )
      if(!getDiscountData){
        res.status(404).json({success:false,message:['Data not found.']})
      }

      // Check user role and permissions
      const { role, adminRole, identityId } = req;

      // Allow access if the user is a Merchant OR (if an Admin, only allow if adminRole is Master)
      if (!(role === UserRoleEnums.Merchant || (role === UserRoleEnums.Admin && adminRole === AdminRoleEnums.Master))) {
        return res.status(403).json({ success: false, message: ['Permission Denied!!.'] });
      }

      const discount = await DiscountModel.findByIdAndUpdate(
        getDiscountData._id,
        { $set: {isDeleted:true } },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: ['Discount deleted successfully.'],
        data: getDiscountData._id,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to Delete Discount, Please try again later.'] });
    }
  }

  static async GetAllDiscountsMerchants(req:AuthenticatedRequest,res:Response):Promise<any>{
    try {
       // Extract merchantId from route params
       const { merchantId } = req.params;
       if (!merchantId) {
         return res.status(400).json({ success: false, message: ['Merchant ID is required'] });
       }

      // roles handle
       const {role , adminRole ,identityId}  = req;
       if (role !== UserRoleEnums.Admin && role !== UserRoleEnums.Merchant) {
        return res.status(403).json({ success: false, message: ['Permission Denied!!.'] });
      }
 
       // Extract and parse query parameters
       const pageNumber = parseInt(req.query.pageNumber as string) || 1;
       const pageSize = parseInt(req.query.pageSize as string) || 10;
       const searchBy = req.query.searchBy as string;
       const searchValue = req.query.searchValue as string;
       const status = req.query.status as string;
       let isApproved: boolean | undefined;
       if (req.query.isApproved !== undefined) {
         isApproved = req.query.isApproved === 'true';
       }
 
       // Build the filter object
       const filter: any = { merchantId, isDeleted: false };
 
       if (status) {
         filter.status = status;
       }
       if (isApproved !== undefined) {
         filter.isApproved = isApproved;
       }
       // If search criteria are provided and allowed search field is provided (discountNumber or title)
       if (searchBy && searchValue && (searchBy === 'discountNumber' || searchBy === 'title')) {
         filter[searchBy] = { $regex: searchValue, $options: 'i' };
       }
 
       // Calculate skip value for pagination
       const skip = (pageNumber - 1) * pageSize;
 
       // Query the discounts collection with pagination and sort by createdAt descending
       const discounts = await DiscountModel.find(filter)
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(pageSize);
 
       // Optionally, count total documents for pagination metadata
       const totalCount = await DiscountModel.countDocuments(filter);
 
       return res.status(200).json({
         success: true,
         message: ['Discounts fetched successfully'],
         data: {
           discounts,
           pageNumber,
           pageSize,
           totalCount,
         },
       });
    } catch (error) {
      console.error(error);
      return res.status(500).json({success:false,message:['Unable to load all discount , Please try again later.']})
    }
  }

  static async GetAllDiscountsMaster(req:AuthenticatedRequest,res:Response):Promise<any>{
    try {
      // roles handle
      const {role , adminRole ,identityId}  = req;
      if (role !== UserRoleEnums.Admin || adminRole !== AdminRoleEnums.Master) {
        return res.status(403).json({ success: false, message: ['Permission Denied!!.'] });
      }

      // Extract and parse query parameters
      const pageNumber = parseInt(req.query.pageNumber as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const searchBy = req.query.searchBy as string;
      const searchValue = req.query.searchValue as string;
      const status = req.query.status as string;
      let isApproved: boolean | undefined;
      if (req.query.isApproved !== undefined) {
        isApproved = req.query.isApproved === 'true';
      }

      // Build the filter object
      const filter: any = { isDeleted: false };

      if (status) {
        filter.status = status;
      }
      if (isApproved !== undefined) {
        filter.isApproved = isApproved;
      }
      // If search criteria are provided and allowed search field is provided (discountNumber or title)
      if (searchBy && searchValue && (searchBy === 'discountNumber' || searchBy === 'title')) {
        filter[searchBy] = { $regex: searchValue, $options: 'i' };
      }

      // Calculate skip value for pagination
      const skip = (pageNumber - 1) * pageSize;

      // Query the discounts collection with pagination and sort by createdAt descending
      const discounts = await DiscountModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);

      // Optionally, count total documents for pagination metadata
      const totalCount = await DiscountModel.countDocuments(filter);

      return res.status(200).json({
        success: true,
        message: ['Discounts fetched successfully'],
        data: {
          discounts,
          pageNumber,
          pageSize,
          totalCount,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({success:false,message:['Unable to load all discount , Please try again later.']})
    }
  }

  // general student..
  static async GetAllDiscountByStudentLocation(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const {tags} = req.body; // make sure to send array inside 

      // Retrieve the student record using the identityId (stored as userid)
      const student = await StudentModel.findOne({ userid: identityId, isdeleted: false });
      if (!student) {
        return res.status(404).json({ success: false, message: ['Student not found'] });
      }
      
      // Use query parameters for location if provided, otherwise fall back to the student's location.
      const queryCity = req.query.city as string;
      const queryCountry = req.query.country as string;
      const city = queryCity || student.StudentCity;
      const country = queryCountry || student.StudentCountry;
      
      // Pagination parameters
      const pageNumber = parseInt(req.query.pageNumber as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const skip = (pageNumber - 1) * pageSize;

      const pricing = await PremiumPricingModel.findOne({ });       

      // Build base filter:
      // - Discount must be approved, active, and not deleted.
      // - Discount must have remainingUses > 0.
      // - Discount must be from a merchant in the specified city or country.
      const filter: any = {
        isApproved: true,
        status: DiscountStatusEnums.Active,
        isDeleted: false,
        discountpercentage:{$lte:pricing.discountminium},
        remainingUses: { $gt: 0 },
        $or: [
          { merchantCity: city },
          { merchantCountry: country }
        ]
      };

      if (tags?.length > 0) {
        filter.tags = { $in: tags };
      }
      
      // Use an aggregation pipeline to add a computed field (cityMatch)
      // This field is 1 if the discount's merchantCity matches the student's city, 0 otherwise.
      // Then sort by cityMatch descending so that city matches appear on top.
      const aggregationPipeline = [
        { $match: filter },
        {
          $addFields: {
            cityMatch: {
              $cond: [{ $eq: ["$merchantCity", city] }, 1, 0]
            }
          }
        },
        { $sort: { cityMatch: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize }
      ];
      //@ts-ignore
      const discounts = await DiscountModel.aggregate(aggregationPipeline);
      
      const totalCount = await DiscountModel.countDocuments(filter);

      return res.status(200).json({
        success: true,
        message: ['Discounts fetched successfully'],
        data: {
          discounts,
          pageNumber,
          pageSize,
          totalCount
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to load discounts, please try again later.'] });
    }
  }
  static async GetAllDiscountByStudentPremiumLocation(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const {tags} = req.body; // make sure to send array inside 

      // Retrieve the student record using the identityId (stored as userid)
      const student = await StudentModel.findOne({ userid: identityId, isdeleted: false });
      if (!student) {
        return res.status(404).json({ success: false, message: ['Student not found'] });
      }
      
      // Use query parameters for location if provided, otherwise fall back to the student's location.
      const queryCity = req.query.city as string;
      const queryCountry = req.query.country as string;
      const city = queryCity || student.StudentCity;
      const country = queryCountry || student.StudentCountry;
      
      // Pagination parameters
      const pageNumber = parseInt(req.query.pageNumber as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const skip = (pageNumber - 1) * pageSize;

      const pricing = await PremiumPricingModel.findOne({ });       

      // Build base filter:
      // - Discount must be approved, active, and not deleted.
      // - Discount must have remainingUses > 0.
      // - Discount must be from a merchant in the specified city or country.
      const filter: any = {
        isApproved: true,
        status: DiscountStatusEnums.Active,
        isDeleted: false,
        discountpercentage:{$gte:pricing.discountminium},
        remainingUses: { $gt: 0 },
        $or: [
          { merchantCity: city },
          { merchantCountry: country }
        ]
      };

      if (tags.length > 0) {
        filter.tags = { $in: tags };
      }
      
      // Use an aggregation pipeline to add a computed field (cityMatch)
      // This field is 1 if the discount's merchantCity matches the student's city, 0 otherwise.
      // Then sort by cityMatch descending so that city matches appear on top.
      const aggregationPipeline = [
        { $match: filter },
        {
          $addFields: {
            cityMatch: {
              $cond: [{ $eq: ["$merchantCity", city] }, 1, 0]
            }
          }
        },
        { $sort: { cityMatch: -1 as 1 | -1, createdAt: -1 as 1 | -1 } },
        { $skip: skip },
        { $limit: pageSize }
      ];
      
      const discounts = await DiscountModel.aggregate(aggregationPipeline);
      
      // Also get the total count (without pagination) for pagination metadata
      const totalCount = await DiscountModel.countDocuments(filter);

      return res.status(200).json({
        success: true,
        message: ['Discounts fetched successfully'],
        data: {
          discounts,
          pageNumber,
          pageSize,
          totalCount
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to load discounts, please try again later.'] });
    }
  }


  static async DiscountById(req:AuthenticatedRequest,res:Response):Promise<any>{
    try {
      const {discountId}=req.params;

      const discountData = await DiscountModel.findOne(
        {_id:discountId,isDeleted:false}
      )

      if(!discountData){
        return res.status(400).json({
          data:{},
          success:false,
          message:['no data found']
        })
      }

      return res.status(200).json({
        data:discountData,
        success:true,
        message:['Discount data found successfully.']
      })

    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to load discount, please try again later.'] });
    }
  }

}

export default DiscountController;