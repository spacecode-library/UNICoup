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
  title: string;
  description: string;
  backgroundImage: string;
  termsCondition: string;
  venue: string;
  status: string;
  eventScope: string;
  timeZone: string; // IANA time zone (e.g., "America/Los_Angeles")
  eventType: string; // IN_PERSON, ONLINE, or HYBRID
  onlineLink?: string; // Optional link for ONLINE or HYBRID events
  isDeleted: boolean;
}

const EventSchema: Schema = new Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, required: true, trim: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  backgroundImage: { type: String, required: true },
  termsCondition: { type: String, required: true },
  venue: { type: String, required: true },
  status: { type: String, default: EventStatusEnums.Upcoming },
  eventScope: { type: String, required: true },
  timeZone: { type: String, required: true }, // New field for the event's reference time zone
  eventType: { type: String, required: true, enum: Object.values(EventTypeEnums) }, // New field for event type
  onlineLink: { type: String, required: false }, // Optional field for online/hybrid events
  isDeleted: { type: Boolean, default: false },
});

const EventModel = mongoose.model<IEvent>('Event', EventSchema);
export default EventModel;
