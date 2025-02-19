import mongoose, { Schema, Document } from "mongoose";
import { StudentStatusEnums } from "../constants/EnumTypes.js";


// Base User Interface
export interface ISTUDENT extends Document {
  _id: string;
  name: string;
  userid: string;
  email: string;
  otp: string;
  otpExpires: Date;
  university: string;
  universityDomain: string; //Discuss with Rahul
  major: string;
  StartYear: number;
  GraduationYear: number;
  StudentID: string;
  StudentCardDocument: string;
  StudentCity:string,
  StudentState:string,
  StudentCountry:string,
  isdeleted: boolean;
  status: string;
  StudentIDSubmitted: boolean;
  isVerified: boolean; 
  isPremium: boolean;
}

// Base Student Schema
const StudentSchema: Schema = new Schema(
  {
      _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
      // name: { type: String, required: false, trim: true },
      userid: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      otp: { type: String, required: false },
      otpExpires: { type: Date, required: false },
      university: { type: String, required: true, trim: true },
      universityDomain: { type: String, required: false }, 
      major: { type: String, required: true, trim: true },
      StartYear: { type: Number, required: true },
      GraduationYear: { type: Number, required: true },
      StudentID: { type: String, required: true },
      StudentCardDocument: { type: String, required: false },
      StudentCity:{type:String,required:true},
      StudentState:{type:String,required:true},
      StudentCountry:{type:String,required:true},
      isdeleted: { type: Boolean, default: false },
      status: { type: String, enum: Object.values(StudentStatusEnums), default: StudentStatusEnums.Pending },
      StudentIDSubmitted: { type: Boolean, default: false },
      isVerified: { type: Boolean, default: false }, // Add this field
      isPremium: { type: Boolean, default: false }, // Add this field
  },
  { timestamps: true, discriminatorKey: 'role' }
);

// Create Student Model
const StudentModel = mongoose.model<ISTUDENT>("STUDENT", StudentSchema);
export default StudentModel;