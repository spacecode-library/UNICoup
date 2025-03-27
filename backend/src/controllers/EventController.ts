import { Request, Response } from 'express';
import { DateTime } from 'luxon';
import { z } from 'zod';
import EventModel, { EventTypeEnums } from '../models/EventModel.js';
import StudentModel from '../models/StudentModel.js';
import RegisteredEventModel from '../models/RegisteredEventModel.js';
import UserModel from '../models/UserModel.js';

// Extend the Request type to include the `user` property
interface AuthenticatedRequest extends Request {
  identityId: string;
  role: string;
  adminRole: string;
}

// Validation schemas using Zod
const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  venue: z.string().min(1, 'Venue is required'),
  startTime: z.number().int().positive('startTime must be a positive integer'),
  endTime: z.number().int().positive('endTime must be a positive integer'),
  timeZone: z.string().refine(
    (value) => DateTime.local().setZone(value).isValid,
    (value) => ({ message: `Invalid time zone: ${value}` })
  ),
  eventScope: z.enum(['PUBLIC', 'UNIVERSITY'], {
    message: 'eventScope must be either PUBLIC or UNIVERSITY',
  }),
  eventType: z.enum([EventTypeEnums.IN_PERSON, EventTypeEnums.ONLINE, EventTypeEnums.HYBRID], {
    message: 'eventType must be either IN_PERSON, ONLINE, or HYBRID',
  }),
  termsCondition: z.string().min(1, 'Terms and conditions are required'),
  backgroundImage: z.string().url('Background image must be a valid URL'),
});

const getEventDataSchema = z.object({
  eventScope: z.enum(['PUBLIC', 'UNIVERSITY'], {
    message: 'eventScope must be either PUBLIC or UNIVERSITY',
  }),
});

const registerEventSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});

const editEventSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  venue: z.string().min(1, 'Venue is required').optional(),
  startTime: z.number().int().positive('startTime must be a positive integer').optional(),
  endTime: z.number().int().positive('endTime must be a positive integer').optional(),
  timeZone: z
    .string()
    .refine(
      (value) => DateTime.local().setZone(value).isValid,
      (value) => ({ message: `Invalid time zone: ${value}` })
    )
    .optional(),
  eventScope: z
    .enum(['PUBLIC', 'UNIVERSITY'], {
      message: 'eventScope must be either PUBLIC or UNIVERSITY',
    })
    .optional(),
  eventType: z
    .enum([EventTypeEnums.IN_PERSON, EventTypeEnums.ONLINE, EventTypeEnums.HYBRID], {
      message: 'eventType must be either IN_PERSON, ONLINE, or HYBRID',
    })
    .optional(),
  termsCondition: z.string().min(1, 'Terms and conditions are required').optional(),
  backgroundImage: z.string().url('Background image must be a valid URL').optional(),
});

class EventController {
  static async createEvent(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;

      // Validate request body
      const validatedData = createEventSchema.parse(req.body);

      const { title, description, venue, startTime, endTime, timeZone, eventScope, eventType, termsCondition, backgroundImage } = validatedData;

      // Validate startTime < endTime
      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: ['startTime must be before endTime'],
        });
      }

      const newEvent = new EventModel({
        userId: identityId,
        title,
        description,
        venue,
        startTime, // Already in UTC (converted by frontend)
        endTime, // Already in UTC (converted by frontend)
        timeZone, // Store the event's anchor time zone
        eventScope,
        eventType,
        termsCondition,
        backgroundImage,
        isDeleted: false,
      });

      await newEvent.save();

      return res.status(201).json({
        success: true,
        message: ['Event created successfully'],
        data: newEvent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: error.errors.map((e) => e.message),
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to create event'] });
    }
  }

  static async getEventData(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;

      // Validate request body
      const validatedData = getEventDataSchema.parse(req.body);
      const { eventScope } = validatedData;

      // Define the query
      const query: any = { eventScope, isDeleted: false };

      // Only filter by userId if eventScope is not PUBLIC
      if (eventScope !== 'PUBLIC') {
        query.userId = identityId;
      }

      const events = await EventModel.find(query);

      if (events.length === 0) {
        return res.status(403).json({
          success: false,
          message: ['No data found'],
          data: {},
        });
      }

      return res.status(200).json({
        success: true,
        message: ['Event Data fetch successfully'],
        data: events,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: error.errors.map((e) => e.message),
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to fetch event'] });
    }
  }

  static async registeredEvent(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;

      // Validate request body
      const validatedData = registerEventSchema.parse(req.body);
      const { eventId } = validatedData;

      // Check if the event exists
      const event = await EventModel.findOne({ _id: eventId, isDeleted: false });
      if (!event) {
        return res.status(403).json({
          success: false,
          message: ['Event not found'],
          data: {},
        });
      }

      // Check if the student exists
      const studentData = await StudentModel.findOne(
        { userId: identityId, isDeleted: false },
        { _id: 1, userId: 1 }
      );

      if (!studentData) {
        return res.status(403).json({
          success: false,
          message: ['Student not found'],
          data: {},
        });
      }

      // Check for duplicate registration
      const existingRegistration = await RegisteredEventModel.findOne({
        userId: identityId,
        eventId,
        isDeleted: false,
      });

      if (existingRegistration) {
        return res.status(400).json({
          success: false,
          message: ['Student is already registered for this event'],
          data: {},
        });
      }

      const registeredStudent = new RegisteredEventModel({
        userId: identityId,
        eventId,
        isDeleted: false,
      });

      await registeredStudent.save();
      return res.status(201).json({
        success: true,
        message: ['Event registered successfully'],
        data: registeredStudent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: error.errors.map((e) => e.message),
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to register for event'] });
    }
  }

  static async getRegisteredStudents(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const { id: eventId } = req.query as { id: string };

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: ['eventId is required'],
        });
      }

      // Find the event
      const event = await EventModel.findOne({ _id: eventId, isDeleted: false });
      if (!event) {
        return res.status(403).json({
          success: false,
          message: ['No data found'],
          data: {},
        });
      }

      // For non-PUBLIC events, restrict access to the event creator
      if (event.eventScope !== 'PUBLIC' && event.userId.toString() !== identityId) {
        return res.status(403).json({
          success: false,
          message: ['Unauthorized: You can only view registrations for your own events'],
          data: {},
        });
      }

      // Find all registered students for this event
      const registrations = await RegisteredEventModel.find({ eventId, isDeleted: false });

      const userIds = registrations.map((item) => item.userId);

      const studentData = await UserModel.find(
        { _id: { $in: userIds }, isDeleted: false },
        { name: 1, email: 1 }
      );

      return res.status(200).json({
        success: true,
        message: ['Registered students fetched successfully'],
        data: studentData,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to fetch registered students'] });
    }
  }

  static async deleteEvent(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const { id } = req.params;

      const eventData = await EventModel.findOne({
        _id: id,
        userId: identityId,
        isDeleted: false,
      });

      if (!eventData) {
        return res.status(403).json({
          success: false,
          message: ['No data found or you are not authorized to delete this event'],
          data: {},
        });
      }

      await EventModel.findByIdAndUpdate(
        { _id: eventData._id },
        { isDeleted: true },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: ['Data deleted successfully'],
        data: {
          eventId: eventData._id,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to delete event'] });
    }
  }

  static async eventEdit(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const { id } = req.params;

      // Validate request body
      const validatedData = editEventSchema.parse(req.body);

      const eventData = await EventModel.findOne({
        _id: id,
        userId: identityId,
        isDeleted: false,
      });

      if (!eventData) {
        return res.status(403).json({
          success: false,
          message: ['No data found or you are not authorized to edit this event'],
          data: {},
        });
      }

      const updateData: any = {};

      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.venue !== undefined) updateData.venue = validatedData.venue;
      if (validatedData.startTime !== undefined) updateData.startTime = validatedData.startTime;
      if (validatedData.endTime !== undefined) updateData.endTime = validatedData.endTime;
      if (validatedData.timeZone !== undefined) updateData.timeZone = validatedData.timeZone;
      if (validatedData.eventScope !== undefined) updateData.eventScope = validatedData.eventScope;
      if (validatedData.eventType !== undefined) updateData.eventType = validatedData.eventType;
      if (validatedData.termsCondition !== undefined) updateData.termsCondition = validatedData.termsCondition;
      if (validatedData.backgroundImage !== undefined) updateData.backgroundImage = validatedData.backgroundImage;

      // Validate startTime < endTime if both are provided
      if (updateData.startTime !== undefined && updateData.endTime !== undefined) {
        if (updateData.startTime >= updateData.endTime) {
          return res.status(400).json({
            success: false,
            message: ['startTime must be before endTime'],
          });
        }
      }

      const updatedEvent = await EventModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: ['Event updated successfully'],
        data: updatedEvent,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: error.errors.map((e) => e.message),
        });
      }
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to edit event'] });
    }
  }
}

export default EventController;
