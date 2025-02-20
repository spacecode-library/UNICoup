import { Request, Response, NextFunction } from 'express';
import UserModel from '../models/UserModel.js';
import AuthModel from '../models/Authmodel.js';
import { validateAccessToken } from '../utils/Jwt.js';
import { UserRoleEnums } from '../constants/EnumTypes.js';

export const MerchantMW = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const bearerHeader = req.headers['authorization'];
        const token = bearerHeader ? bearerHeader.split(" ")[1] : "";

        // Validate token
        const tokenPayload = await validateAccessToken(token);
       
        if (!tokenPayload || tokenPayload.role !== UserRoleEnums.Merchant) {
            return res.status(401).json({ success: false, message: ['Invalid Token'] });
        }

        const { identityId, authId, role } = tokenPayload;

        // Verify user and auth records
        const getUserData = await UserModel.findOne(
            { _id: identityId, isdeleted: false, role: role },
            { _id: 1, role: 1 }
        );
        const getAuthData = await AuthModel.findOne(
            { _id: authId, isdeleted: false }
        );

        if (!getUserData || !getAuthData) {
            return res.status(401).json({ success: false, message: ['Unauthorized'] });
        }

        req['identityId'] = getUserData._id;
        req['role'] = getUserData.role;
        
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ success: false, message: ['Invalid Token'] });
    }
};