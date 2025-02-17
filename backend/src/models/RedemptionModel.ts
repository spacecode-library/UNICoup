import mongoose, { Schema, Document } from 'mongoose';

export interface IRedemption extends Document {
  _id: string;
  studentId: string; // Foreign key to STUDENT (To verify student in Middleware)
  discountId: string; // Foreign key to DISCOUNT
  redemptionCode: string; // Unique redemption code incase we will need it later to generate QR code (when we implement)
  redemptionDate: Date; // Date of redemption
  isRedeemed: boolean; // Whether the redemption was successful
}

const RedemptionSchema = new Schema<IRedemption>(
  {
    studentId: { type: String, required: true, trim: true },
    discountId: { type: String, required: true, trim: true },
    redemptionCode: { type: String, required: true, trim: true, unique: true },
    redemptionDate: { type: Date, default: Date.now },
    isRedeemed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const RedemptionModel = mongoose.model<IRedemption>('Redemption', RedemptionSchema);
export default RedemptionModel;