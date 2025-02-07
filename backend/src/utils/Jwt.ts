import jwt from "jsonwebtoken"
import "dotenv/config"

interface TokenPayload extends jwt.JwtPayload {
    authId: string;
    identityId: string;
    role: string;
}

// Generate Access Token ...
export const generateAccessToken = async (payload: any, tokenExpiredAt: number) =>{
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET_KEY as string, {
        expiresIn: tokenExpiredAt
    })
    return accessToken;
}

// Generate Refresh Token ...
export const  generateRefreshToken = async (payload: any, refreshTokenExpiredAt: number) => {
    const refreshToken = jwt.sign(payload,process.env.REFRESH_TOKEN_SECRET_KEY as string,
      {  expiresIn: refreshTokenExpiredAt}
    )
    return refreshToken;
}

// Validate Access Token ...
export const validateAccessToken = async (accessToken: string): Promise<TokenPayload | null>  => {
    try {
        const decodeToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET_KEY as string) as TokenPayload;
        return decodeToken;
    } catch (error) {
        return null;
    }
}