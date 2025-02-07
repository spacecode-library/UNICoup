import mongoose, { Schema, Document } from "mongoose";


// Base User Interface
export interface ISTUDENT extends Document {
  _id: string;
  userid: string;
  university: string;
  major: string;
  StartYear: number;
  GraduationYear: number;
  StudentID: string;
  StudentCardDocument: string;
  isdeleted: boolean;
}

// Base Student Schema
const StudentSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString()},
    userid: { type: String, required: true, trim: true },
    university: { type: String, required: true, trim: true },
    major: { type: String, required: true, trim: true },
    StartYear: { type: Number, required: true },
    GraduationYear: { type: Number, required: true },
    StudentID: { type: String, required: true },
    StudentCardDocument: { type: String, required: true },
    isdeleted: { type: Boolean, default: false }
  },
  { timestamps: true, discriminatorKey: "role" } // Enables role-based models
);

// Create Student Model
const StudentModel = mongoose.model<ISTUDENT>("STUDENT", StudentSchema);
export default StudentModel;