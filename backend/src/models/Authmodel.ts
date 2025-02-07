import mongoose, { Schema, Document } from "mongoose";

// Base User Interface
export interface IAUTH extends Document {
  _id: string;
  identityid: string;
  token: string;
  tokenExpiredAt: number;
  refreshToken: string;
  refreshTokenExpiredAt: number;
  isdeleted: boolean;
}

// Base Merchant Schema
const AuthSchema: Schema = new Schema(
  {
    _id: { type: String },
    identityid: { type: String, required: true, trim: true },
    token: { type: String, required: true, trim: true },
    tokenExpiredAt: { type: String, required: true, trim: true },
    refreshToken: { type: String, required: true, trim: true },
    refreshTokenExpiredAt: { type: String, required: true },
    isdeleted: { type: Boolean, default: false }
  },

  { timestamps: true, discriminatorKey: "role" } // Enables role-based models
);

// Create Merchant Model
const AuthModel = mongoose.model<IAUTH>("AUTH", AuthSchema);
export default AuthModel;