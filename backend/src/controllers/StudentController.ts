import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import OtpModel from '../models/OtpModel.js';
import StudentModel from '../models/StudentModel.js';
import UserModel from '../models/UserModel.js';
import { verifyUniversityDomain } from '../services/universityVerificationService.js';
import sendEmailVerificationOTP from '../utils/SendEmailVerification.js';
import { generateAccessToken, generateRefreshToken, validateAccessToken } from '../utils/Jwt.js';
import AuthModel from '../models/Authmodel.js';
import cloudinary from 'cloudinary';
import multer from 'multer';

// Extend the Request type to include the `file` property and user data
interface AuthenticatedRequest extends Request {
    file?: Express.Multer.File;
    user?: { identityId: string; role: string };
}

class StudentController {
    // Middleware to authenticate user
    static async authenticateUser(req: AuthenticatedRequest, res: Response, next: any): Promise<Response> {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ success: false, message: ['Authorization token missing'] });
            }

            // Validate access token
            const decoded = await validateAccessToken(token);
            if (!decoded || !decoded.identityId) {
                return res.status(401).json({ success: false, message: ['Invalid token'] });
            }

            // Attach user data to request
            req.user = {
                identityId: decoded.identityId,
                role: decoded.role,
            };

            next();
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Authentication failed'] });
        }
    }

    // Initiate email verification process for onboarding
    static async initiateVerification(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const { email } = req.body;

            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }

            console.log("Received email:", email);

            // Verify university domain
            const isUniversityEmail = await verifyUniversityDomain(email);
            if (!isUniversityEmail) {
                return res.status(400).json({ message: 'Invalid university email' });
            }

            // Check if an OTP already exists for this email
            const existingOtp = await OtpModel.findOne({ email, isdeleted: false, verified: 0 });
            if (existingOtp) {
                return res.status(400).json({ message: 'An OTP is already sent to this email. Please check your inbox.' });
            }

            // Generate a secure 4-digit OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');
            const currentTimestamp = Math.floor(Date.now() / 1000);

            // Send OTP to the user's email
            const otpSend = await sendEmailVerificationOTP(email, OTP);
            if (!otpSend) {
                return res.status(500).json({ message: 'Unable to send OTP, please try again later' });
            }

            // Save OTP details in the OtpModel
            const otpData = new OtpModel({
                _id: new mongoose.Types.ObjectId().toString(),
                otp: OTP,
                created: currentTimestamp,
                expired: currentTimestamp + 300, // 5 minutes validity
                email: email,
                resendLimit: 5,
                resendCount: 0,
                verifyAttempts: 0,
                verified: 0,
                isdeleted: false,
            });

            await otpData.save();

            res.status(200).json({ message: 'Verification email sent successfully', data: { requestId: otpData._id } });
        } catch (error) {
            console.error('Error initiating verification:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Verify OTP provided by the student for onboarding
    static async verifyOTP(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const { requestId, otp } = req.body;

            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            if (!requestId || !otp) {
                return res.status(400).json({ message: 'Request ID and OTP are required' });
            }

            // Find the OTP record by requestId
            const getOtpData = await OtpModel.findOne(
                { _id: requestId, isdeleted: false },
                { otp: 1, expired: 1, verifyAttempts: 1, email: 1 }
            );

            if (!getOtpData) {
                return res.status(404).json({ message: 'Invalid request ID' });
            }

            const currentTimestamp = Math.floor(Date.now() / 1000);
            const storedOtp = getOtpData.otp;
            const otpExpired = getOtpData.expired;

            // Check if OTP has expired
            if (currentTimestamp > otpExpired) {
                return res.status(400).json({ message: 'OTP has expired' });
            }

            // Check if OTP is valid
            if (storedOtp !== otp) {
                const verifyAttempts = getOtpData.verifyAttempts + 1;
                await OtpModel.findByIdAndUpdate(getOtpData._id, { $set: { verifyAttempts } }, { new: true });
                return res.status(400).json({ message: 'Invalid OTP' });
            }

            // Mark the OTP as verified and clear it
            await OtpModel.findByIdAndUpdate(getOtpData._id, { $set: { verified: 1, isdeleted: true } }, { new: true });

            // Update the student's verification status in the StudentModel
            const student = await StudentModel.findOneAndUpdate(
                { email: getOtpData.email },
                { $set: { isVerified: true, status: 'verified' } },
                { upsert: true, new: true }
            );

            res.status(200).json({ message: 'OTP verified successfully' });
        } catch (error) {
            console.error('Error verifying OTP:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Resend OTP for onboarding
    static async resendOtp(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const { requestId } = req.body;

            if (!req.user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            if (!requestId) {
                return res.status(400).json({ message: 'Request ID is required' });
            }

            // Find the OTP record by requestId
            const getOtpData = await OtpModel.findOne(
                { _id: requestId, isdeleted: false },
                { resendLimit: 1, resendCount: 1, email: 1 }
            );

            if (!getOtpData) {
                return res.status(404).json({ message: 'Invalid request ID' });
            }

            const resendLimit = getOtpData.resendLimit;
            const resendCount = getOtpData.resendCount;

            // Check if resend limit is exceeded
            if (resendCount >= resendLimit) {
                return res.status(403).json({ message: 'Resend limit exceeded' });
            }

            // Generate a new OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');
            const currentTimestamp = Math.floor(Date.now() / 1000);

            // Send the new OTP to the user's email
            const otpSend = await sendEmailVerificationOTP(getOtpData.email, OTP);
            if (!otpSend) {
                return res.status(500).json({ message: 'Unable to resend OTP, please try again later' });
            }

            // Update the OTP record
            await OtpModel.findByIdAndUpdate(getOtpData._id, {
                $set: {
                    otp: OTP,
                    created: currentTimestamp,
                    expired: currentTimestamp + 300, // 5 minutes validity
                    resendCount: resendCount + 1,
                },
            }, { new: true });

            res.status(200).json({
                message: 'New OTP sent successfully',
                data: {
                    requestId: getOtpData._id,
                    expiredAt: currentTimestamp + 300,
                    resendRemains: resendLimit - (resendCount + 1),
                },
            });
        } catch (error) {
            console.error('Error resending OTP:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Upload Student ID and validate it
    static async uploadStudentID(req: AuthenticatedRequest, res: Response): Promise<Response> {
        const { name, university, major, StartYear, GraduationYear, StudentID } = req.body;
        const file = req.file;

        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            // Find the student by userId
            const student = await StudentModel.findOne({ _id: req.user.identityId });

            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            if (!student.isVerified) {
                return res.status(403).json({ message: 'Please verify your OTP before uploading the document' });
            }

            // Step 1: Extract text from the uploaded document using OCR
            const ocrResult = await cloudinary.v2.uploader.explicit(file.filename, {
                resource_type: 'image',
                type: 'upload',
                ocr: 'adv_ocr',
            });

            const extractedText = ocrResult.info.ocr.adv_ocr.data[0].textAnnotations
                .map((annotation: { description: string }) => annotation.description)
                .join(' ');

            // Step 2: Validate the document
            const isDocumentValid = await validateStudentID(file.filename, extractedText, name);
            if (!isDocumentValid) {
                return res.status(400).json({ message: 'Invalid Student ID document' });
            }

            // Step 3: Save the document URL and update student details
            student.name = name;
            student.university = university;
            student.major = major;
            student.StartYear = StartYear;
            student.GraduationYear = GraduationYear;
            student.StudentID = StudentID;
            student.StudentCardDocument = file.path; // Cloudinary URL
            student.status = 'verified'; // Set status to verified after document upload
            await student.save();

            res.status(200).json({ message: 'Student ID uploaded successfully.' });
        } catch (error) {
            console.error('Error uploading Student ID:', error);
            res.status(500).json({ message: 'Failed to upload Student ID' });
        }
    }
}

// Helper function to validate the Student ID document
const validateStudentID = async (filePath: string, extractedText: string, studentName: string): Promise<boolean> => {
    // Check if the document contains the student's name
    const isNameValid = extractedText.toLowerCase().includes(studentName.toLowerCase());
    if (!isNameValid) {
        return false;
    }

    // Check if the document contains a face using Cloudinary's Advanced Facial Attributes Detection
    const faceDetectionResult = await cloudinary.v2.uploader.explicit(filePath, {
        resource_type: 'image',
        type: 'upload',
        detection: 'adv_face',
    });

    const hasFace = faceDetectionResult.info.detection?.adv_face?.data.length > 0;
    return hasFace ?? false;
};

export default StudentController;