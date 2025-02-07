import { Request, Response, NextFunction } from 'express';
import { validateAccessToken } from '../utils/Jwt.js';
import UserModel from '../models/UserModel.js';
import { UserRoleEnums } from '../constants/EnumTypes.js';
import AuthModel from '../models/Authmodel.js';


export const MerchantMW = async (req: Request, res: Response, next: NextFunction):Promise<any> => {
    try {
        const bearerHeader = req.headers['authorization'];
        const token = bearerHeader ? bearerHeader.split(" ")[1]:"";

        // validate token
        const tokenPayload = await validateAccessToken(token);

        if(tokenPayload == null ||  tokenPayload.role !== UserRoleEnums.Merchant){
            return res.status(401).json({success: false, message: ["Invalid Token"]})
        }

        const { identityId,authId,role} = tokenPayload;

        const getMerchantData = await UserModel.findOne(
            { _id: identityId,isdeleted:false,role: role},
            { _id: 1}
        )

        const getAuthData = await AuthModel.findOne(
            { _id: authId,isdeleted:false},
        )

        if(getMerchantData == null || getAuthData == null){
            return res.status(401).json({success:false,message:["Merchant not found"]});
        }

        req['identityId'] = getMerchantData._id;
        next();
    } catch (error) {
        console.log(error)
        return res.status(401).json({ succeeded: false, message: ["Invalid Token"] });
    }
}