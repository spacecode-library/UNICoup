import mongoose, { Schema, Document } from "mongoose";

// Base User Interface
export interface IMERCHANT extends Document {
  _id: string;
  userid: string;
  businessname: string;
  businessaddress: string;
  businessphone: string;
  BusinessCertificate: string;
  isVerifed: boolean;
  businesslogo: string;
  businesswebsite: string;
  businessdescription: string;
  status: string;
  isCompletedRegistration: boolean;
  isdeleted: boolean;
}

// Base Merchant Schema
const MerchantSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString()},
    userid: { type: String, required: true, trim: true },
    businessname: { type: String, required: true, trim: true },
    businessaddress: { type: String, required: true, trim: true },
    businessphone: { type: String, required: true, trim: true },
    BusinessCertificate: { type: String, required: true },
    isVerifed: { type: Boolean, default: false },
    businesslogo: { type: String, required: true },
    businesswebsite: { type: String, required: false, trim: true },
    businessdescription: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    isCompletedRegistration: { type: Boolean, default: false },
    isdeleted: { type: Boolean, default: false }
  },

  { timestamps: true, discriminatorKey: "role" } // Enables role-based models
);

// Create Merchant Model
const MerchantModel = mongoose.model<IMERCHANT>("MERCHANT", MerchantSchema);
export default MerchantModel;
