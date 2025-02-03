import mongoose, { Schema, Document } from "mongoose";

// Define User Roles
export enum UserRole {
  STUDENT = "STUDENT",
  MERCHANT = "MERCHANT",
  ADMIN = "ADMIN"
}

// Base User Interface
export interface IUser extends Document {
  id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isdeleted: boolean;
}

// Base User Schema
const UserSchema: Schema = new Schema(
  {
    id: { type: new mongoose.Types.ObjectId().toString() },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: Object.values(UserRole), required: true },
    isdeleted: { type: Boolean, default: false }
  },
  { timestamps: true, discriminatorKey: "role" } // Enables role-based models
);

// Create User Model
const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
