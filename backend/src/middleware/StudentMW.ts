import { Request, Response, NextFunction } from 'express';
import { validateAccessToken } from '../utils/Jwt.js';
import UserModel from '../models/UserModel.js';
import { UserRoleEnums } from '../constants/EnumTypes.js';
import AuthModel from '../models/Authmodel.js';


export const StudentMW = async (req: Request, res: Response, next: NextFunction):Promise<any> => {
    try {
        const bearerHeader = req.headers['authorization'];
        const token = bearerHeader ? bearerHeader.split(" ")[1]:"";

        // validate token
        const tokenPayload = await validateAccessToken(token);

        if(tokenPayload == null ||  tokenPayload.role !== UserRoleEnums.Student){
            return res.status(401).json({success: false, message: ["Invalid Token"]})
        }

        const { identityId,authId,role} = tokenPayload;

        const getStudentData = await UserModel.findOne(
            { _id: identityId,isdeleted:false,role: role},
            { _id: 1}
        )

        const getAuthData = await AuthModel.findOne(
            { _id: authId,isdeleted:false},
        )

        if(getStudentData == null || getAuthData == null){
            return res.status(401).json({success:false,message:["User not found"]});
        }

        req['identityId'] = getStudentData._id;
        next();
    } catch (error) {
        console.log(error)
        return res.status(401).json({ succeeded: false, message: ["Invalid Token"] });
    }
}