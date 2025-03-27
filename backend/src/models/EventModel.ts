import mongoose, { Schema, Document } from 'mongoose';
import { EventStatusEnums } from '../constants/EnumTypes.js';

// Define the event type enum
export enum EventTypeEnums {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
  HYBRID = 'HYBRID',
}

export interface IEvent extends Document {
  _id: string;
  userId: string;
  startTime: number;
  endTime: number;
  timeZone: string; // New field for the event's anchor time zone
  title: string;
  description: string;
  backgroundImage: string;
  termsCondition: string;
  venue: string;
  status: string;
  eventScope: string;
  eventType: string; // New field for event type (IN_PERSON, ONLINE, HYBRID)
  isDeleted: boolean;
}

const EventSchema: Schema = new Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, required: true, trim: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  timeZone: { type: String, required: true }, // E.g., "America/Los_Angeles"
  title: { type: String, required: true },
  description: { type: String, required: true },
  backgroundImage: { type: String, required: true },
  termsCondition: { type: String, required: true },
  venue: { type: String, required: true },
  status: { type: String, default: EventStatusEnums.Upcoming }, // Ignored since computed in frontend
  eventScope: { type: String, required: true },
  eventType: { type: String, required: true, enum: Object.values(EventTypeEnums) }, // IN_PERSON, ONLINE, HYBRID
  isDeleted: { type: Boolean, default: false },
});

const EventModel = mongoose.model<IEvent>('Event', EventSchema);
export default EventModel;
