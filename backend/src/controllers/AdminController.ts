import { Request, Response } from 'express';
import StudentModel from '../models/StudentModel.js';
import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, validateAccessToken } from '../utils/Jwt.js';
import AuthModel from '../models/Authmodel.js';
import mongoose from 'mongoose';

// Extend the Request type to include the `user` property
interface AuthenticatedRequest extends Request {
    user?: {
        identityId: string;
        role: string;
    };
}

class AdminController {
    // Admin login...
    static async adminLogin(req: Request, res: Response): Promise<any> {
        try {
            let { email, password, role } = req.body;

            const getAdminData = await UserModel.findOne(
                { email: email, isdeleted: false },
                { password: 1, role: 1 }
            );

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
                identityId: getAdminData.id,
                role: getAdminData.role,
            };

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
                    tokenExpiredAt: new Date(Date.now() + tokenExpiredAt * 1000),
                    refreshToken: refreshToken,
                    refreshTokenExpiredAt: new Date(Date.now() + refreshTokenExpiredAt * 1000),
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ['Unable to Login, please try again later'] });
        }
    }

    // Middleware to authenticate admin
    static async authenticateAdmin(req: AuthenticatedRequest, res: Response, next: any): Promise<Response> {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ success: false, message: ['Authorization token missing'] });
            }

            // Validate token
            const decoded = await validateAccessToken(token);
            if (!decoded || !decoded.identityId) {
                return res.status(401).json({ success: false, message: ['Invalid token'] });
            }

            // Attach admin data to request
            req.user = {
                identityId: decoded.identityId,
                role: decoded.role,
            };

            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ['Authentication failed'] });
        }
    }

    // Fetch pending students awaiting approval
    static async getPendingStudents(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, message: ['Unauthorized'] });
            }

            // Ensure only authorized roles can access this endpoint
            if (req.user.role !== 'master' && req.user.role !== 'user_approval') {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Fetch students with status "pending" and StudentIDSubmitted: true
            const pendingStudents = await StudentModel.find(
                { status: 'pending', isdeleted: false, StudentIDSubmitted: true },
                { name: 1, university: 1, major: 1, StartYear: 1, GraduationYear: 1, StudentID: 1, StudentCardDocument: 1, status: 1 }
            );

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

            if (!req.user) {
                return res.status(401).json({ success: false, message: ['Unauthorized'] });
            }

            // Ensure only authorized roles can approve students
            if (req.user.role !== 'master' && req.user.role !== 'user_approval') {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Update student status to "approved"
            const student = await StudentModel.findByIdAndUpdate(
                studentId,
                { $set: { status: 'approved' } },
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

            if (!req.user) {
                return res.status(401).json({ success: false, message: ['Unauthorized'] });
            }

            // Ensure only authorized roles can reject students
            if (req.user.role !== 'master' && req.user.role !== 'user_approval') {
                return res.status(403).json({ success: false, message: ['Permission denied'] });
            }

            // Update student status to "rejected"
            const student = await StudentModel.findByIdAndUpdate(
                studentId,
                { $set: { status: 'rejected' } },
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
            return res.status(500).json({ success: false, message: ['Unable to reject student'] });
        }
    }


    // Middleware to check if the admin is authenticated
   static async middlewareCheck(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: ['Unauthorized'] });
        }
        // Ensure only authorized roles can access this endpoint
        if (req.user.role !== 'master' && req.user.role !== 'user_approval') {
            return res.status(403).json({ success: false, message: ['Permission denied'] });
        }
        return res.status(200).json({
            success: true,
            message: ['Admin is authenticated and authorized'],
            data: { identityId: req.user.identityId, role: req.user.role },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: ['Internal server error'] });
    }
}
}

export default AdminController;