import mongoose, { Schema, Document } from "mongoose";
import { MerchantStatusEnums } from "../constants/EnumTypes.js";

// Base User Interface
export interface IMERCHANT extends Document {
  _id: string;
  userid: string;
  businessname: string;
  businessaddress: string;
  businesscity: string;
  businessstate: string;
  businesscountry: string;
  businessphone: string;
  BusinessCertificate: string;
  isVerifed: boolean;
  businesslogo: string;
  businesswebsite?: string; // Optional field
  businessdescription: string;
  status: string;
  isCompletedRegistration: boolean;
  isdeleted: boolean;
}

// Base Merchant Schema
const MerchantSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userid: { type: String, required: true, trim: true },
    businessname: { type: String, required: true, trim: true },
    businessaddress: { type: String, required: true, trim: true },
    businesscity: { type: String, required: true, trim: true },
    businessstate: { type: String, required: true, trim: true },
    businesscountry: { type: String, required: true, trim: true },
    businessphone: { type: String, required: true, trim: true },
    BusinessCertificate: { type: String, required: true },
    isVerifed: { type: Boolean, default: false },
    businesslogo: { type: String, required: true },
    businesswebsite: { type: String, required: false, trim: true }, // Optional field
    businessdescription: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(MerchantStatusEnums), default: MerchantStatusEnums.Pending },
    isCompletedRegistration: { type: Boolean, default: false },
    isdeleted: { type: Boolean, default: false },
  },
  
  { timestamps: true, discriminatorKey: "role" } // Enables role-based models
);

// Pre-save hook to validate required fields when registration is marked as complete
MerchantSchema.pre<IMERCHANT>('save', async function (next) {
  if (this.isCompletedRegistration) {
    const missingFields = [];
    if (!this.businessname) missingFields.push('businessname');
    if (!this.businessaddress) missingFields.push('businessaddress');
    if (!this.businessphone) missingFields.push('businessphone');
    if (!this.BusinessCertificate) missingFields.push('BusinessCertificate');
    if (!this.businesslogo) missingFields.push('businesslogo');
    if (!this.businessdescription) missingFields.push('businessdescription');

    if (missingFields.length > 0) {
      return next(new Error(`Missing required fields: ${missingFields.join(', ')}`));
    }
  }
  next();
});

// Create Merchant Model
const MerchantModel = mongoose.model<IMERCHANT>("MERCHANT", MerchantSchema);
export default MerchantModel;