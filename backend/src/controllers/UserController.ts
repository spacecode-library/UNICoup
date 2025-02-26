import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import crypto from 'crypto';
import UserModel, { UserRole } from '../models/UserModel.js';
import {sendEmailVerificationOTP} from '../utils/SendEmailVerification.js';
import OtpModel from '../models/OtpModel.js';
import mongoose from 'mongoose';
import { generateAccessToken, generateRefreshToken } from '../utils/Jwt.js';
import AuthModel from '../models/Authmodel.js';

// Define API Response Type
interface UserRegistrationResponse {
    success: boolean;
    message: string[];
    data?: {
        id?: string;
        // email: string;
    };
}

class UserController {

    //create user...
    static async userRegistration(req: Request, res: Response<UserRegistrationResponse>): Promise<any> {
        try {
            const currentTimestamp = Math.floor(Date.now() / 1000);

            let { name, email, password, role } = req.body;

            name = name?.trim();
            email = email?.trim().toLowerCase();
            password = password?.trim();

            if (!name || !email || !password || !role) {
                return res.status(400).json({ success: false, message: ["All fields are required"], data: {} });
            }

            // Validate role
            if (!Object.values(UserRole).includes(role)) {
                return res.status(400).json({ success: false, message: ["Invalid role"], data: {} });
            }

            // Check if email is verified or not already exists (case-insensitive)
            const verifiedUser = await OtpModel.findOne({ email, verified: 1, isdeleted:false }, { verified: 1 });
            const existingUser = await UserModel.findOne({ email, isdeleted:false });
            if (existingUser != null && verifiedUser?.verified == 1) {
                return res.status(409).json({ success: false, message: ["Email already exists"], data: {} });
            }

            // Generate salt and hash password
            const saltRounds = process.env.SALT ? Number(process.env.SALT) : 10; // Default to 10
            const salt = await bcrypt.genSalt(saltRounds);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create new user
            let newUser;
            if (!existingUser) {
                newUser = await new UserModel({ name, email, password: hashedPassword, role }).save();
            }
            // Generate secure 4-digit OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');

            // Send OTP to user
            // const otpSend = await sendEmailVerificationOTP(email, OTP);
            // if (!otpSend) {
            //     return res.status(500).json({ success: false, message: ["Unable to send OTP, please try again later"], data: {} });
            // }

            const otpData = new OtpModel();
            otpData.otp = OTP;
            otpData.created = currentTimestamp;
            otpData.expired = currentTimestamp + 300; // 5min validity..
            otpData.email = email;
            await new OtpModel(otpData).save();

            res.status(201).json({
                success: true,
                message: ["Otp Send successfully"],
                data: { id: otpData._id }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ["Unable to Register, please try again later"] });
        }
    };


    // resend otp...
    static async resendOtp(req: Request, res: Response): Promise<any> {
        try {
            // Extract request body parameters
            let { requestId } = req.body;

            const getOtpData = await OtpModel.findOne(
                { _id: requestId,isdeleted:false },
                { _id: 1, resendLimit: 1, resendCount: 1 }
            );

            if (getOtpData == null) {
                return res.status(404).json({ success: false, message: ["Error occured while resend otp."], data: {} })
            }

            const currentTimestamp = Math.floor(Date.now() / 1000);

            // Generate secure 4-digit OTP
            const OTP = Array.from({ length: 4 }, () => crypto.randomInt(0, 10)).join('');

            let resendLimit = getOtpData.resendLimit;
            let resendCount = getOtpData.resendCount;

            if (resendLimit <= resendCount) {
                return res.status(403).json({ success: false, message: ["Limit exceeded. You can't send otp again."], data: {} })
            }

            resendCount += 1;

            await OtpModel.findByIdAndUpdate(getOtpData._id,{
                $set:{ 
                    otp: OTP,
                    created: currentTimestamp,
                    expired: currentTimestamp + 300,
                    resendCount: resendCount
             } }, { new: true });

            return res.status(200).json({
                success: true,
                message: ["Otp send successfully"],
                data: {
                    requestId: getOtpData._id,
                    expiredAt: getOtpData.expired,
                    resendRemains: resendLimit - resendCount,
                }
            })

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ["Unable to resend otp, please try again later"] });
        }
    }

    //verify otp
    static async verifyOtp(req: Request, res: Response): Promise<any> {
        try {

            // Extract request body parameters
            let { requestId, otp } = req.body;

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
                    message: ["Login Failed! Invalid OTP please try again later."],
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

            const getUserData = await UserModel.findOne(
                { email: getOtpData.email, isdeleted: false },
                { _id: 1, name: 1,role:1 } 
            )

            if (getUserData == null) {
                return res.status(400).json({
                    success: false,
                    message: ["Error occured while verify otp."],
                    data: {}
                })
            }

            const authTokenId = new mongoose.Types.ObjectId().toString();
            console.log("user",getUserData.role)
            const payload = {
                authId: authTokenId,
                identityId: getUserData.id,
                role: getUserData.role
            }

            let newDate = new Date();

            const tokenExpiredAt = 60 * 60;
            const accessToken = await generateAccessToken(payload, tokenExpiredAt);

            const refreshTokenExpiredAt = 60 * 60 * 24 * 20;
            const refreshToken = await generateRefreshToken(payload, refreshTokenExpiredAt);

            const tokenData = new AuthModel();
            tokenData._id = authTokenId;
            tokenData.identityid = getUserData.id;
            tokenData.token = accessToken;
            tokenData.tokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60);
            tokenData.refreshToken = refreshToken;
            tokenData.refreshTokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 20);

            await new AuthModel(tokenData).save();

            return res.status(200).json({
                message: ['Login Successfully.'],
                succeeded: true,
                data: {
                    identityId: getUserData.id,
                    token: accessToken,
                    tokenExpiredAt: newDate.setSeconds(tokenExpiredAt),
                    refreshToken: refreshToken,
                    refreshTokenExpiredAt: newDate.setSeconds(refreshTokenExpiredAt),
                }
            })
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ["Unable to verify otp, please try again later"] });
        }
    }

    //generate token...
    static async generateToken(req: Request, res: Response): Promise<any> {
        try {
            // let {token,refreshToken}  = req.body;

            const getTokenData = await AuthModel.findOne(
                { refreshToken: req.body.refreshToken, isdeleted: false },
                { _id: 1, identityid: 1 }
            );
            
            const getUserData = await UserModel.findOne(
                { _id: getTokenData.identityid, isdeleted: false },
                { _id: 1, name: 1, role: 1 }
            )

            if (getTokenData == null) {
                return res.status(400).json({
                    success: false,
                    message: ["Error occured while generating refresh token."],
                    data: {}
                })
            }

            const authTokenId = new mongoose.Types.ObjectId().toString();

            const payload = {
                authId: authTokenId,
                identityId: getTokenData.identityid,
                role: getUserData.role
            }

            let newDate = new Date();

            const tokenExpiredAt = 60 * 60;
            const accessToken = await generateAccessToken(payload, tokenExpiredAt);

            const refreshTokenExpiredAt = 60 * 60 * 24 * 20;
            const refreshToken = await generateRefreshToken(payload, refreshTokenExpiredAt);

            const tokenData = new AuthModel();
            tokenData._id = authTokenId;
            // tokenData.parentId = getTokenData._id;
            tokenData.identityid = getTokenData.identityid;
            tokenData.token = accessToken;
            tokenData.tokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60);
            tokenData.refreshToken = refreshToken;
            tokenData.refreshTokenExpiredAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 20);

            await new AuthModel(tokenData).save();

            return res.status(200).json({
                message: ['Token Generated Successfully.'],
                succeeded: true,
                data: {
                    identityId: getTokenData.identityid,
                    token: accessToken,
                    tokenExpiredAt: newDate.setSeconds(tokenExpiredAt),
                    refreshToken: refreshToken,
                    refreshTokenExpiredAt: newDate.setSeconds(refreshTokenExpiredAt),
                }
            })
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ["Unable to generate token, please try again later"] });
        }
    }
}



export default UserController;