import mongoose, { Schema, Document } from "mongoose";

// Interface for OTP Document
export interface IOTP extends Document {
  _id: string;
  otp: string;
  created: number;
  expired: number;
  email: string;
  requestEnvironment: Record<string, any>;
  resendLimit: number;
  resendCount: number;
  verifyAttempts: number;
  verified: number;
  isdeleted: boolean;
}

// OTP Schema
const OtpSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    otp: { type: String, required: true, trim: true },
    created: { type: Number, required: true },
    expired: { type: Number, required: true },
    email: { type: String, required: true },
    requestEnvironment: { type: Object, default: {} },
    resendLimit: { type: Number, default: 5 },
    resendCount: { type: Number, default: 0 },
    verifyAttempts: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
   isdeleted: { type: Boolean, default: false },
  },
  { timestamps: true, discriminatorKey: "role" } 
);

// Create OTP Model
const OtpModel = mongoose.model<IOTP>("OTP", OtpSchema);
export default OtpModel;