import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import OtpModel from '../models/OtpModel.js';
import StudentModel from '../models/StudentModel.js';
import UserModel from '../models/UserModel.js';
import { verifyUniversityDomain } from '../services/universityVerificationService.js';
import { generateAccessToken, generateRefreshToken, validateAccessToken } from '../utils/Jwt.js';
import AuthModel from '../models/Authmodel.js';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { StudentStatusEnums } from '../constants/EnumTypes.js';
import { sendEmailVerificationOTP } from '../utils/SendEmailVerification.js';
import RedemptionModel from '../models/RedemptionModel.js';

// Extend the Request type to include the `file` property and user data
interface AuthenticatedRequest extends Request {
    file?: Express.Multer.File;
    identityId:string;
}

interface StudentDetails {
  email: any;
  name?: string;
  university: string;
  universityDomain: string;
  major: string;
  StartYear: number;
  GraduationYear: number;
  StudentID: string;
  StudentCardDocument?: string;
  StudentCity: string;
  StudentState: string;
  StudentCountry: string;
  isVerified: boolean;
  status: string;
}

class StudentController {

    static async studentLogin(req: Request, res: Response): Promise<any> {
        try {
            let { email, password, role } = req.body;

            const getStudentData = await UserModel.findOne(
                { email: email, isdeleted: false },
                { password: 1, role: 1 }
            )

            if(getStudentData === null || getStudentData.role !== role ){
                return res.status(400).json({ success: false, message: ["Invalid Email or Password"] ,data:{}});
            }

            const isMatch = await bcrypt.compare(password, getStudentData.password);

            if (!isMatch) {
                return res.status(400).json({ success: false, message: ["Invalid Email or Password"] ,data:{}});
            }

            const authTokenId = new mongoose.Types.ObjectId().toString();

            const payload = {
                authId: authTokenId,
                identityId: getStudentData.id,
                role: getStudentData.role
            }

            let newDate = new Date();

            const tokenExpiredAt = 60 * 60;
            const accessToken = await generateAccessToken(payload, tokenExpiredAt);

            const refreshTokenExpiredAt = 60 * 60 * 24 * 20;
            const refreshToken = await generateRefreshToken(payload, refreshTokenExpiredAt);

            const tokenData = new AuthModel();
            tokenData._id = authTokenId;
            tokenData.identityid = getStudentData.id;
            tokenData.token = accessToken;
            tokenData.tokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60);
            tokenData.refreshToken = refreshToken;
            tokenData.refreshTokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 20);

            await new AuthModel(tokenData).save();

            return res.status(200).json({
                message: ['Student Login Successfully.'],
                success: true,
                data: {
                    identityId: getStudentData.id,
                    token: accessToken,
                    tokenExpiredAt: newDate.setSeconds(tokenExpiredAt),
                    refreshToken: refreshToken,
                    refreshTokenExpiredAt: newDate.setSeconds(refreshTokenExpiredAt),
                }
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ["Unable to Login, please try again later"] });
        }
    }

    static async getStudentStatus(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { identityId } = req;
            
            if (!identityId) {
                return res.status(401).json({ 
                    success: false, 
                    message: ['Authentication required'], 
                    data: null 
                });
            }
    
            // Find the student by user ID
            const student = await StudentModel.findOne({ userid: identityId, isdeleted: false });
            
            if (!student) {
                return res.status(404).json({ 
                    success: false, 
                    message: ['Student profile not found'], 
                    data: null 
                });
            }
    
            // Get the user's email from UserModel if not already in student
            let email = student.email;
            if (!email) {
                const userData = await UserModel.findOne({ _id: identityId, isdeleted: false });
                if (userData) {
                    email = userData.email;
                }
            }
    
            // Prepare the response data
            const studentDetails: StudentDetails = {
                email: email,
                university: student.university || '',
                universityDomain: student.universityDomain || '',
                major: student.major || '',
                StartYear: student.StartYear || 0,
                GraduationYear: student.GraduationYear || 0,
                StudentID: student.StudentID || '',
                StudentCardDocument: student.StudentCardDocument || '',
                StudentCity: student.StudentCity || '',
                StudentState: student.StudentState || '',
                StudentCountry: student.StudentCountry || '',
                isVerified: student.isVerified || false,
                status: student.status || StudentStatusEnums.Pending,
                name: student.name || ''
            };
    
            return res.status(200).json({
                success: true,
                message: ['Student status retrieved successfully'],
                data: studentDetails
            });
        } catch (error) {
            console.error('Error getting student status:', error);
            return res.status(500).json({ 
                success: false, 
                message: ['Failed to retrieve student status'], 
                data: null 
            });
        }
    }
    // Initiate email verification process for onboarding
    static async initiateVerification(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { email ,StudentCountry,StudentState,StudentCity,university, major, StartYear, GraduationYear, StudentID} = req.body;

            if (!email) {
                return res.status(400).json({success:false , message: ['Email is required'] });
            }

            console.log("Received email:", email);

            // Verify university domain
            const isUniversityEmail = await verifyUniversityDomain(email);


            // To be tested later 
            if (isUniversityEmail){
               const universityDomain = extractDomain(email);
               await StudentModel.findOneAndUpdate( { userid : req.identityId }, { $set: {universityDomain: universityDomain,StudentCountry:StudentCountry,StudentState:StudentState,StudentCity:StudentCity,university:university,major:major,StartYear:StartYear,GraduationYear:GraduationYear,StudentID:StudentID}},{ upsert: true , new: true } );
            } else {
                return res.status(400).json({ success:true ,message: ['Invalid university email'] });
            }


            // Check if an OTP already exists for this email
            const existingOtp = await OtpModel.findOne({ email, isdeleted: false, verified: 0 });
            if (existingOtp) {
                return res.status(400).json({ success:true , message: ['An OTP is already sent to this email. Please check your inbox.'] });
            }

            // Generate a secure 4-digit OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');
            const currentTimestamp = Math.floor(Date.now() / 1000);

            // Send OTP to the user's email
            // const otpSend = await sendEmailVerificationOTP(email, OTP);
            // if (!otpSend) {
            //     return res.status(500).json({ message: 'Unable to send OTP, please try again later' });
            // }

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

            res.status(200).json({ success:true , message: ['Verification otp sent successfully'], data: { requestId: otpData._id } });
        } catch (error) {
            console.error('Error initiating verification:', error);
            return res.status(500).json({ message: 'Unable to send Verification otp , Please try again later' });
        }
    }

    // Verify OTP provided by the student for onboarding
    static async verifyOTP(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { requestId, otp } = req.body;
            const identityId = req.identityId;
            if (!requestId || !otp) {
                return res.status(400).json({ success:false , message: ['Request ID and OTP are required'] });
            }

            // Find the OTP record by requestId
            const getOtpData = await OtpModel.findOne(
                { _id: requestId, isdeleted: false },
                { otp: 1, expired: 1, verifyAttempts: 1, email: 1 }
            );

            if (!getOtpData) {
                return res.status(404).json({success:true , message: ['Invalid request ID'] });
            }

            const currentTimestamp = Math.floor(Date.now() / 1000);
            const storedOtp = getOtpData.otp;
            const otpExpired = getOtpData.expired;

            // Check if OTP has expired
            if (currentTimestamp > otpExpired) {
                return res.status(400).json({ success:true , message: 'OTP has expired' });
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
                { $set: { userid: identityId, isVerified: true} },
                { upsert: true, new: true }
            );

            res.status(200).json({ success:true , message: ['OTP verified successfully'] });
        } catch (error) {
            console.error('Error verifying OTP:', error);
            return res.status(500).json({success:false, message: ['Unable to verify Otp,Please try again later'] });
        }
    }

    // Resend OTP for onboarding
    static async resendOtp(req: AuthenticatedRequest, res: Response): Promise<any> {
        try {
            const { requestId } = req.body;

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
                return res.status(403).json({ success:false , message: ['Resend limit exceeded'] });
            }

            // Generate a new OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');
            const currentTimestamp = Math.floor(Date.now() / 1000);

            // Send the new OTP to the user's email
            const otpSend = await sendEmailVerificationOTP(getOtpData.email, OTP);
            if (!otpSend) {
                return res.status(500).json({ success:false , message: ['Unable to resend OTP, please try again later'] });
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
                message:[ 'New OTP sent successfully'],
                data: {
                    requestId: getOtpData._id,
                    expiredAt: currentTimestamp + 300,
                    resendRemains: resendLimit - (resendCount + 1),
                },
            });
        } catch (error) {
            console.error('Error resending OTP:', error);
            return res.status(500).json({ success:false , message: ['Unable to send otp , please try again later'] });
        }
    }

    // Upload Student ID and validate it
    static async uploadStudentID(req: AuthenticatedRequest, res: Response): Promise<any> {
        const { name, email } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            // Find the student by userId
            const student = await StudentModel.findOne({ userid: req.identityId , isdeleted:false });
            const getStudentData = await UserModel.findOne({_id:req.identityId,isdeleted:false});

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
            const isDocumentValid = await validateStudentID(file.filename, extractedText, getStudentData.name);
            if (!isDocumentValid) {
                return res.status(400).json({ message: 'Invalid Student ID document' });
            }
            if (email && !student.email) {
                student.email = email;
            }
            // Step 3: Save the document URL and update student details
            // student.name = name;
            // student.university = university;
            // student.major = major;
            // student.StartYear = StartYear;
            // student.GraduationYear = GraduationYear;
            // student.StudentID = StudentID;
            student.StudentCardDocument = file.path; // Cloudinary URL
            student.status = StudentStatusEnums.Pending; // Set status to verified after document upload
            student.StudentIDSubmitted = true;
            await student.save();

            res.status(200).json({success:true,  message: ['Student ID uploaded successfully.'] });
        } catch (error) {
            console.error('Error uploading Student ID:', error);
            return res.status(500).json({ success:false , message: ['Failed to upload Student ID'] });
        }
    }

    // send otp for verifying graduation
    static async sendOtpForGraduation(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {identityId} = req;

            const currentTimestamp = Math.floor(Date.now() / 1000);

            const student = await StudentModel.find(
                {userid:identityId,isdeleted:false,hasGraduated:false},
                {_id:1 , email:1}
            )
            if(!student){
                return res.status(404).json({success:false,message:['No Data found']});
            }

            // Generate secure 4-digit OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');

            // Send OTP to user
            const otpSend = await sendEmailVerificationOTP(student[0].email, OTP);
            if (!otpSend) {
                return res.status(500).json({ success: false, message: ["Unable to send OTP, please try again later"], data: {} });
            }

            const otpData = new OtpModel();
            otpData.otp = OTP;
            otpData.created = currentTimestamp;
            otpData.expired = currentTimestamp + 300; // 5min validity..
            otpData.email = student[0].email;
            await new OtpModel(otpData).save();

            res.status(201).json({
                success: true,
                message: ["Otp Send successfully"],
                data: { id: otpData._id }
            });
        } catch (error) {
            console.error('Error in sending otp for graduation',error);
            return res.status(500).json({success:false,message:['Failed to send otp for graduation']});
        }

    }

    // verify graduation status
    static async verifyGraduation(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {identityId} = req;
            const { requestId, otp } = req.body;
            const currentTimestamp = Math.floor(Date.now() / 1000);

            const getOtpData = await OtpModel.findOne(
                { _id: requestId,isdeleted:false },
                { _id: 1, otp: 1, expired: 1, verifyAttempts: 1, email: 1 }
            );

            if (getOtpData == null) {
                return res.status(400).json({
                    success: false,
                    message: ["Error occured while verify otp."],
                    data: {}
                })
            }

            let getotp = getOtpData.otp;
            let otpExpired = getOtpData.expired;
            let verifyAttempts = getOtpData.verifyAttempts;

            if (getotp != otp || currentTimestamp > otpExpired) {
                return res.status(403).json({
                    message: ["Invalid OTP please try again later."],
                    succeeded: false,
                    data: {}
                })
            }

            verifyAttempts += 1;

            await OtpModel.findByIdAndUpdate(getOtpData._id, {
                $set: {
                    verifyAttempts: verifyAttempts,
                    verified: 1
                }
            },
            { new: true });

            await StudentModel.findOneAndUpdate(
                { userid: identityId, isdeleted: false },
                { $set: { hasGraduated:true , graduationVerifyTime: Date.now() } },
                { upsert: true, new: true }
            );

            return res.status(200).json({
                success: true,
                message: ["Graduation status verified successfully."],
                data: {}
            });            
        } catch (error) {
            console.error('Error in verifying graduation:', error);
            return res.status(500).json({ success:false , message: ['Failed to verify graduation status'] });
        }
    }

    // get student redemption history by student id

    static async studentRedemptionHistory(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {

            const {identityId} = req;

            const studentData = await StudentModel.findOne(
                {userid:identityId,isdeleted:false},
                {_id:1}
            )

            const redemptionHistory = await RedemptionModel.find(
                {studentId:studentData._id}
            )

            if(!redemptionHistory){
                return res.status(400).json({
                    success:false,data:{},message:['No data found']
                })
            }
            return res.status(200).json({
                success:true,
                message:['Redemption history found'],
                data:redemptionHistory
            })
            
        } catch (error) {
            console.error('Error in student redemption:', error);
            return res.status(500).json({ success:false , message: ['Error in student redemption history'] });
        }
    }

    static async redemptionDetail(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {identityId} = req;
            const {redemptionId} = req.params;

            const redemptionData = await RedemptionModel.findOne(
                {_id:redemptionId}
            )

            if(!redemptionData){
                return res.status(400).json({
                    success:false,message:['no data found'],data:{}
                })
            }

            return res.status(200).json({
                success:true,
                message:['redemption data found successfully'],
                data:redemptionData
            })

        } catch (error) {
            console.error('Error in redemption detail:', error);
            return res.status(500).json({ success:false , message: ['Error in redemption detail'] });
        }
    }

    


    

}

// Helper function to validate the Student ID document
const validateStudentID = async (filePath: string, extractedText: string, studentName: string): Promise<boolean> => {
    // Check if the document contains the student's name
    console.log(extractedText)
    const isNameValid = extractedText.toLowerCase().includes(studentName.toLowerCase());
    console.log(isNameValid);
    if (!isNameValid) {
        return false;
    }
    return true;
    // Check if the document contains a face using Cloudinary's Advanced Facial Attributes Detection
    // const faceDetectionResult = await cloudinary.v2.uploader.explicit(filePath, {
    //     resource_type: 'image',
    //     type: 'upload',
    //     detection: 'adv_face',
    // });

    // const hasFace = faceDetectionResult.info.detection?.adv_face?.data?.length > 0;
    
    // return hasFace ?? false;
};




const extractDomain = (email?: string): string | null => {
    if (!email || !email.includes('@')) {
        console.error('Invalid email format:', email);
        return null;
    }
    return email.split('@')[1];
};

export default StudentController;
