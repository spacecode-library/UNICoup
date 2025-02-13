import mongoose, { Schema, Document } from "mongoose";

export interface IDiscount extends Document {
  _id: string;
  merchantId: string; // Merchant offering the discount (FK)
  merchantCity: string; // Merchant's city
  merchantCountry: string; // Merchant's country
  adminId: string; // Admin who approved the discount
  title: string; // Title of the discount
  description: string; // Description of the discount
  discountType: string; // Type of business: "Online" or "Offline"
  discountCode?: string; // Discount code (if applicable)
  storeLink: string; // Link to the online store (for online businesses)
  totalUses: number; // Total allowed uses of the discount
  remainingUses: number; // Remaining uses of the discount
  startDate: Date; // Start date of the discount
  endDate: Date; // Expiration date of the discount
  eligibilityCriteria: string; // Eligibility criteria (e.g., university domain)
  isOpenAll: boolean; // Whether the discount is open to all students
  status: string; // Status: "active", "expired", "disabled", "created"
  createdAt: Date; // Timestamp of creation
  updatedAt: Date; // Timestamp of last update
  isApproved: boolean; // Check if the discount is approved
  tags: string[]; // Relevant tags that match the discount
  isDeleted: boolean; // Soft delete flag
  backgroundImage?: string; // URL of the background image
}

const DiscountSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    merchantId: { type: String, required: true, trim: true },
    merchantCity: { type: String, required: true, trim: true },
    merchantCountry: { type: String, required: true, trim: true },
    adminId: { type: String, required: false, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    discountType: { type: String, enum: ["Online", "Offline"], required: true },
    discountCode: { type: String, required: false, trim: true },
    storeLink: { type: String, required: false, trim: true },
    totalUses: { type: Number, required: true, min: 1 },
    remainingUses: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    eligibilityCriteria: { type: String, required: false, trim: true },
    isOpenAll: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "expired", "disabled", "created"],
      default: "created",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: false },
    tags: [{ type: String, required: false, trim: true }],
    isDeleted: { type: Boolean, default: false },
    backgroundImage: { type: String, required: false },
  },
  { timestamps: true }
);

const DiscountModel = mongoose.model<IDiscount>("Discount", DiscountSchema);
export default DiscountModel;