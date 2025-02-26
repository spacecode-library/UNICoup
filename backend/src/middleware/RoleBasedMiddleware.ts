//@ts-nocheck
import jwt from 'jsonwebtoken';
import { AdminMW } from './AdminMW.js';
import { MerchantMW } from './MerchantMW.js';
import "dotenv/config";


// Custom role-based middleware that dispatches to either AdminMW or MerchantMW based on token contents
function roleBasedMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  // Assuming a Bearer token scheme
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);
    
    // Assuming the decoded token contains a 'role' property, e.g., 'Admin' or 'Merchant'
    if (decoded.role === 'ADMIN') {
      // Optionally attach additional admin details to req if needed
    //   req.adminRole = decoded.adminRole;
      return AdminMW(req, res, next);
    } else if (decoded.role === 'MERCHANT') {
      // Optionally attach merchant identity to req if needed
      req.identityId = decoded.userId;
      return MerchantMW(req, res, next);
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized role' });
    }
  } catch (error) {
    console.log(error)
    return res.status(401).json({ success: false, message: 'Token is invalid or expired' });
  }
}

export default roleBasedMiddleware;