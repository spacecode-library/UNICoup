import mongoose, { Schema, Document } from "mongoose";

export interface IMerchantPricingModel extends Document {
  _id: string;
  allmerchantfee: number;
}

const MerchantPricingSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    allmerchantfee: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

const MerchantPricingModel = mongoose.model<IMerchantPricingModel>("MerchantPricingSchema", MerchantPricingSchema);
export default MerchantPricingModel;