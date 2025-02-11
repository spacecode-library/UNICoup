import { Request, Response, NextFunction } from 'express';
import { validateAccessToken } from '../utils/Jwt.js';
import UserModel from '../models/UserModel.js';
import { AdminRoleEnums, UserRoleEnums } from '../constants/EnumTypes.js';
import AuthModel from '../models/Authmodel.js';
import AdminModel from '../models/AdminModel.js';


export const AdminMW = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const bearerHeader = req.headers['authorization'];
        const token = bearerHeader ? bearerHeader.split(" ")[1] : "";

        // validate token
        const tokenPayload = await validateAccessToken(token);
        if (tokenPayload == null || tokenPayload.role !== UserRoleEnums.Admin) {
            return res.status(401).json({ success: false, message: ["Invalid Token"] })
        }

        const { identityId, authId, role, adminRole } = tokenPayload;

        const getAdminData = await UserModel.findOne(
            { _id: identityId, isdeleted: false, role: role },
            { _id: 1, role: 1 }
        )
        const getAuthData = await AuthModel.findOne(
            { _id: authId, isdeleted: false },
        )
        const getAdminRoleData = await AdminModel.findOne(
            { userid: identityId, isdeleted: false },
            { AdminRole: 1 }
        )
      
        if (getAdminRoleData?.AdminRole !== adminRole) {
            return res.status(401).json({ success: false, message: ['Unauthorized.'] })
        }
        if (getAdminData == null || getAuthData == null) {
            return res.status(401).json({ success: false, message: ["Admin not found"] });
        }

        req['identityId'] = getAdminData._id;
        req['role'] = getAdminData.role;
        req['adminRole'] = getAdminRoleData ? getAdminRoleData.AdminRole : AdminRoleEnums.Default
        next();
    } catch (error) {
        console.log(error)
        return res.status(401).json({ succeeded: false, message: ["Invalid Token"] });
    }
}