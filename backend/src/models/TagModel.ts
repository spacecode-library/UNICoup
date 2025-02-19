import mongoose, { Schema, Document } from "mongoose";

export interface ITags extends Document {
  _id: string;
  title:String;
  description:String;
  createdAt: Date; // Timestamp of creation
  updatedAt: Date; // Timestamp of last update
  isDeleted: boolean; // Soft delete flag
}

const TagsSchema: Schema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    title:{type:String, required:true},
    description:{type:String, required:true},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TagsModel = mongoose.model<ITags>("Tags", TagsSchema);
export default TagsModel;