import mongoose, { Schema, Document } from "mongoose";

export interface IPremiumPricing extends Document {
  _id: string;
  discountminium: number;
}

const PremiumPricingSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    discountminium: { type: Number, required: true, min: 20 },
  },
  { timestamps: true }
);

const PremiumPricingModel = mongoose.model<IPremiumPricing>("PremiumPricing", PremiumPricingSchema);
export default PremiumPricingModel;