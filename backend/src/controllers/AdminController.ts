import { Request, Response } from 'express';
import StudentModel from '../models/StudentModel.js';
import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, validateAccessToken } from '../utils/Jwt.js';
import AuthModel from '../models/Authmodel.js';
import mongoose from 'mongoose';
import AdminModel from '../models/AdminModel.js';
import { AdminRoleEnums, MerchantStatusEnums, StudentStatusEnums, UserRoleEnums } from '../constants/EnumTypes.js';
import MerchantPricingModel from '../models/MerchantPricingModel.js';
import TagsModel from '../models/TagModel.js';
import MerchantModel from '../models/MerchantModel.js';

// Extend the Request type to include the `user` property
interface AuthenticatedRequest extends Request {
    identityId: string;
    role: string;
    adminRole: string;
}

class AdminController {
    // Admin login...
    static async adminLogin(req: Request, res: Response): Promise<any> {
        try {
            let { email, password, role } = req.body;

            const getAdminData = await UserModel.findOne(
                { email: email, isdeleted: false },
                { _id: 1, password: 1, role: 1 }
            );

            const getAdminRoleData = await AdminModel.findOne(
                { userid: getAdminData._id, isdeleted: false },
                { AdminRole: 1 }
            )

            if (getAdminData === null || getAdminData.role !== role) {
                return res.status(400).json({ success: false, message: ['Invalid Email or Password'], data: {} });
            }

            const isMatch = await bcrypt.compare(password, getAdminData.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: ['Invalid Email or Password'], data: {} });
            }
            const authTokenId = new mongoose.Types.ObjectId().toString();
            const payload = {
                authId: authTokenId,
                identityId: getAdminData._id,
                role: getAdminData.role,
                adminRole: getAdminRoleData ? getAdminRoleData.AdminRole : AdminRoleEnums.Default
            };

            let newDate = new Date();

            const tokenExpiredAt = 60 * 60; // 1 hour
            const accessToken = await generateAccessToken(payload, tokenExpiredAt);
            const refreshTokenExpiredAt = 60 * 60 * 24 * 20; // 20 days
            const refreshToken = await generateRefreshToken(payload, refreshTokenExpiredAt);

            const tokenData = new AuthModel({
                _id: authTokenId,
                identityid: getAdminData.id,
                token: accessToken,
                tokenExpiredAt: Math.floor(Date.now() / 1000) + tokenExpiredAt,
                refreshToken: refreshToken,
                refreshTokenExpiredAt: Math.floor(Date.now() / 1000) + refreshTokenExpiredAt,
            });

            await tokenData.save();

            return res.status(200).json({
                message: ['Admin Login Successfully.'],
                succeeded: true,
                data: {
                    identityId: getAdminData.id,
                    token: accessToken,
                    tokenExpiredAt: newDate.setSeconds(tokenExpiredAt),
                    refreshToken: refreshToken,
                    refreshTokenExpiredAt: newDate.setSeconds(refreshTokenExpiredAt),
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ['Unable to Login, please try again later'] });
        }
    }

    // create admin profile
    static async adminProfile(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const userId = req.identityId;
            let { adminPhone, adminProfilePic } = req.body;

            const getAdminData = await AdminModel.findOne(
                { userid: userId, isdeleted: false },
                { _id: 1 }
            )
            if (!getAdminData) {
                const newAdminProfile = new AdminModel({
                    userid: userId,
                    Adminphone: adminPhone,
                    AdminProfilePic: adminProfilePic,
                });
                await newAdminProfile.save();

                res.status(201).json({
                    success: true,
                    message: ["Admin profile submitted successfully"],
                    data: newAdminProfile._id
                });
            } else {
                const updatedAdminProfile = await AdminModel.findOneAndUpdate(
                    { userid: userId, isdeleted: false },
                    { adminPhone, adminProfilePic, updatedAt: new Date() },
                    { new: true }
                );

                res.status(200).json({
                    success: true,
                    message: ["Admin profile submitted successfully"],
                    data: updatedAdminProfile._id
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ['Unable to submit admin profile, please try again later'] });
        }
    }

    static async adjustMerchantFees(req, res) {
        try {
          const { percentage } = req.body;
          if (percentage === undefined) {
            return res.status(400).json({ success: false, message: ['Percentage is required'] });
          }
    
          // Update the single MerchantPricing document
          let updatedPricing = await MerchantPricingModel.findOneAndUpdate(
            {},
            { allmerchantfee: percentage },
            { new: true }
          );
    
          // If no pricing document exists, create one
          if (!updatedPricing) {
            updatedPricing = new MerchantPricingModel({ allmerchantfee: percentage });
            await updatedPricing.save();
          }
    
          return res.status(200).json({
            success: true,
            message: ['Merchant fees adjusted successfully'],
            data: updatedPricing,
          });
        } catch (error) {
          console.error(error);
          return res.status(500).json({ success: false, message: ['Failed to adjust merchant fees'] });
        }
      }

    // Middleware to authenticate admin
    // static async authenticateAdmin(req: AuthenticatedRequest, res: Response, next: any): Promise<Response> {
    //     try {
    //         const token = req.headers.authorization?.split(' ')[1];
    //         if (!token) {
    //             return res.status(401).json({ success: false, message: ['Authorization token missing'] });
    //         }

    //         // Validate token
    //         const decoded = await validateAccessToken(token);
    //         if (!decoded || !decoded.identityId) {
    //             return res.status(401).json({ success: false, message: ['Invalid token'] });
    //         }

    //         // Attach admin data to request
    //         req.user = {
    //             identityId: decoded.identityId,
    //             role: decoded.role,
    //         };

    //         next();
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({ success: false, message: ['Authentication failed'] });
    //     }
    // }

    // Fetch pending students awaiting approval
    static async getPendingStudents(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {

            // Ensure only authorized roles can access this endpoint
            // if (req.user.role !== 'master' && req.user.role !== 'user_approval') {
            //     return res.status(403).json({ success: false, message: ['Permission denied'] });
            // }

            // Fetch students with status "pending" and StudentIDSubmitted: true
            const pendingStudents = await StudentModel.find(
                { status: StudentStatusEnums.Pending, isdeleted: false, StudentIDSubmitted: true },
                { name: 1, university: 1, major: 1, StartYear: 1, GraduationYear: 1, StudentID: 1, StudentCardDocument: 1, status: 1 }
            );
            console.log(pendingStudents)
            if (pendingStudents.length === 0) {
                return res.status(404).json({
                    success: true,
                    message: ['No Data Found.'],
                    data: {}
                })
            }

            return res.status(200).json({
                success: true,
                message: ['Pending students retrieved successfully'],
                data: pendingStudents,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to fetch pending students'] });
        }
    }

    // Approve a student
    static async approveStudent(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { studentId } = req.body;

            // Ensure only master and studentmanager roles can approve students
            if (req.role !== UserRoleEnums.Admin && (req.adminRole !== AdminRoleEnums.StudentManager || req.role !== AdminRoleEnums.Master)) {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Update student status to "approved"
            const student = await StudentModel.findByIdAndUpdate(
                studentId,
                { $set: { status: StudentStatusEnums.Verified } },
                { new: true }
            );

            if (!student) {
                return res.status(404).json({ success: false, message: ['Student not found'] });
            }

            return res.status(200).json({
                success: true,
                message: ['Student approved successfully'],
                data: student,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to approve student'] });
        }
    }

    // Reject a student
    static async rejectStudent(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { studentId } = req.body;

            // Ensure only master and studentmanager roles can reject students
            if (req.role !== UserRoleEnums.Admin && (req.adminRole !== AdminRoleEnums.StudentManager || req.role !== AdminRoleEnums.Master)) {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Update student status to "rejected"
            const student = await StudentModel.findByIdAndUpdate(
                studentId,
                { $set: { status: StudentStatusEnums.Rejected } },
                { new: true }
            );

            if (!student) {
                return res.status(404).json({ success: false, message: ['Student not found'] });
            }

            return res.status(200).json({
                success: true,
                message: ['Student rejected successfully'],
                data: student,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to reject student,Please try again later'] });
        }
    }

    // Approve a merchant
    static async approveMerchant(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { merchantId } = req.body;

            // Ensure only master and merchant manager roles can approve merchant
            if (req.role !== UserRoleEnums.Admin ||
                (req.adminRole !== AdminRoleEnums.MerchantManager && req.adminRole !== AdminRoleEnums.Master)) {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Update merchant status to "approved"
            const merchant = await MerchantModel.findByIdAndUpdate(
                merchantId,
                { $set: { status: MerchantStatusEnums.Verified } },
                { new: true }
            );

            if (!merchant) {
                return res.status(404).json({ success: false, message: ['Merchant not found'] });
            }

            return res.status(200).json({
                success: true,
                message: ['Merchant approved successfully'],
                data: merchant,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to approve merchant'] });
        }
    }

     // Reject a merchant
     static async rejectMerchant(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { merchantId } = req.body;

            // Ensure only master and merchantmanager roles can reject merchant
            if (req.role !== UserRoleEnums.Admin ||
                (req.adminRole !== AdminRoleEnums.MerchantManager && req.adminRole !== AdminRoleEnums.Master)) {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Update merchant status to "rejected"
            const merchant = await MerchantModel.findByIdAndUpdate(
                merchantId,
                { $set: { status: MerchantStatusEnums.Rejected } },
                { new: true }
            );

            if (!merchant) {
                return res.status(404).json({ success: false, message: ['Merchant not found'] });
            }

            return res.status(200).json({
                success: true,
                message: ['Merchant rejected successfully'],
                data: merchant,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to reject merchant,Please try again later'] });
        }
    }

    static async createTag (req: Request, res: Response): Promise<any>{
        try {
          const { title, description } = req.body;
          
          // Validate input
          if (!title || !description) {
            return res.status(400).json({ success: false, message: "Title and description are required." });
          }
      
          // Create a new tag document
          const newTag = new TagsModel({ title, description });
          const savedTag = await newTag.save();
      
          return res.status(201).json({ success: true, message: "Tag created successfully.", data: savedTag });
        } catch (error) {
          console.error("Error creating tag:", error);
          return res.status(500).json({ success: false, message: "Internal Server Error." });
        }
    };
      
      static async getAllTags (req: Request, res: Response): Promise<any> {
        try {
          // Fetch all tags that are not marked as deleted
          const tags = await TagsModel.find({ isDeleted: false });
          return res.status(200).json({ success: true, message: "Tags fetched successfully.", data: tags });
        } catch (error) {
          console.error("Error fetching tags:", error);
          return res.status(500).json({ success: false, message: "Internal Server Error." });
        }
      };

      static async deleteTag (req: Request, res: Response): Promise<any> {
        try {
          const { id } = req.params;
      
          // Soft delete: update isDeleted to true
          const tag = await TagsModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
          
          if (!tag) {
            return res.status(404).json({ success: false, message: "Tag not found." });
          }
          
          return res.status(200).json({ success: true, message: "Tag deleted successfully.", data: tag });
        } catch (error) {
          console.error("Error deleting tag:", error);
          return res.status(500).json({ success: false, message: "Internal Server Error." });
        }
    }


}


export default AdminController;