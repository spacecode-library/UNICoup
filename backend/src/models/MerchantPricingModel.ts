import mongoose, { Schema, Document } from "mongoose";

export interface IMerchantPricing extends Document {
  _id: string;
  allmerchantfee: number;
}

const MerchantSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    allmerchantfee: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

const MerchantModel = mongoose.model<IMerchantPricing>("PremiumPricing", MerchantSchema);
export default MerchantModel;