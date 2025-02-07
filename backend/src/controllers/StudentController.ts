import { Request, Response } from 'express';
import StudentModel from '../models/StudentModel.js';
import UserModel from '../models/UserModel.js';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken } from '../utils/Jwt.js';
import AuthModel from '../models/Authmodel.js';
import mongoose from 'mongoose';

class StudentController {


    //login student...
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
                succeeded: true,
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
            res.status(500).json({ success: false, message: ["Unable to Login, please try again later"] });
        }
    }

    static async middlewareCheck(req:Request,res:Response):Promise<any>{
        try {
            return res.status(200).json({ success: true, message: ["Inside middleware check student"] });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: ["Unable to Login, please try again later"] });
            
        }
    }
}

export default StudentController;