import mongoose, { Schema, Document } from "mongoose";


// Base User Interface
export interface ISTUDENT extends Document {
  _id: string;
  name: string;
  userid: string;
  email: string;
  otp: string;
  otpExpires: Date;
  university: string;
  major: string;
  StartYear: number;
  GraduationYear: number;
  StudentID: string;
  StudentCardDocument: string;
  isdeleted: boolean;
  status: string;
  StudentIDSubmitted: boolean;
  isVerified: boolean; 
}

// Base Student Schema
const StudentSchema: Schema = new Schema(
  {
      _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      name: { type: String, required: false, trim: true },
      userid: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      otp: { type: String, required: false },
      otpExpires: { type: Date, required: false },
      university: { type: String, required: true, trim: true },
      major: { type: String, required: true, trim: true },
      StartYear: { type: Number, required: true },
      GraduationYear: { type: Number, required: true },
      StudentID: { type: String, required: true },
      StudentCardDocument: { type: String, required: false },
      isdeleted: { type: Boolean, default: false },
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      StudentIDSubmitted: { type: Boolean, default: false },
      isVerified: { type: Boolean, default: false }, // Add this field
  },
  { timestamps: true, discriminatorKey: 'role' }
);

// Create Student Model
const StudentModel = mongoose.model<ISTUDENT>("STUDENT", StudentSchema);
export default StudentModel;