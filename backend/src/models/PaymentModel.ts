import mongoose, { Schema, Document } from "mongoose";

// Base payment Interface
export interface IPAYMENT extends Document {
  _id: string;
  userid:string;
  orderid:string;
  amount:number;
  email: string;
  createdAt:string;
  expiryAt:string;
  isdeleted: boolean;
  status: string;
}

// Base payment Schema
const PaymentSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    userid: { type: String, required: true, trim: true },
    orderid: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    amount:{type:Number,required:true},
    createdAt: {type:String,required:true},
    expiryAt:{type:String,required:true},
    isdeleted: { type: Boolean, default: false },
    status: { type: String },
  },
  { timestamps: true, discriminatorKey: 'role' }
);

// Create payment Model
const PaymentModel = mongoose.model<IPAYMENT>("PAYMENT", PaymentSchema);
export default PaymentModel;