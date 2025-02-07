import mongoose, { Schema, Document } from "mongoose";

// Base Admin Interface
export interface IADMIN extends Document {
  _id: string;
  userid: string;
  Adminphone: string;
  AdminProfilePic: string;
  master: boolean;
  isdeleted: boolean;
}

// Base Admin Schema
const AdminSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString()  },
    userid: { type: String, required: true, trim: true },
    Adminphone: { type: String, required: true, trim: true },
    AdminProfilePic: { type: String, required: true },
    master: { type: Boolean, default: false },
    isdeleted: { type: Boolean, default: false }
  },

  { timestamps: true, discriminatorKey: "role" } // Enables role-based models
);

// Create Admin Model
const AdminModel = mongoose.model<IADMIN>("ADMIN", AdminSchema);
export default AdminModel;
