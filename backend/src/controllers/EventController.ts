import { Request, Response } from 'express';
import { DateTime } from 'luxon'; // For time zone validation
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

class EventController {
  static async createEvent(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const {
        title,
        description,
        venue,
        startTime,
        endTime,
        eventScope,
        timeZone,
        eventType,
        onlineLink,
        termsCondition,
        backgroundImage,
      } = req.body;

      // Validate required fields
      if (!title || !startTime || !endTime || !eventScope || !timeZone || !eventType) {
        return res.status(400).json({
          success: false,
          message: ['Title, startTime, endTime, eventScope, timeZone, and eventType are required'],
        });
      }

      // Validate startTime and endTime
      if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: ['Invalid start or end time'],
        });
      }

      // Validate eventScope
      if (!['PUBLIC', 'UNIVERSITY'].includes(eventScope)) {
        return res.status(400).json({
          success: false,
          message: ['eventScope must be either PUBLIC or UNIVERSITY'],
        });
      }

      // Validate timeZone using luxon
      const validTimeZone = DateTime.local().setZone(timeZone).isValid;
      if (!validTimeZone) {
        return res.status(400).json({
          success: false,
          message: ['Invalid timeZone. Must be a valid IANA time zone (e.g., America/Los_Angeles)'],
        });
      }

      // Validate eventType
      if (!Object.values(EventTypeEnums).includes(eventType)) {
        return res.status(400).json({
          success: false,
          message: ['eventType must be either IN_PERSON, ONLINE, or HYBRID'],
        });
      }

      // Validate onlineLink for ONLINE or HYBRID events
      if ((eventType === EventTypeEnums.ONLINE || eventType === EventTypeEnums.HYBRID) && !onlineLink) {
        return res.status(400).json({
          success: false,
          message: ['onlineLink is required for ONLINE or HYBRID events'],
        });
      }

      // Ensure onlineLink is not provided for IN_PERSON events
      if (eventType === EventTypeEnums.IN_PERSON && onlineLink) {
        return res.status(400).json({
          success: false,
          message: ['onlineLink should not be provided for IN_PERSON events'],
        });
      }

      const newEvent = new EventModel({
        userId: identityId,
        title,
        description,
        venue,
        startTime,
        endTime,
        eventScope,
        timeZone,
        eventType,
        onlineLink,
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
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to create event'] });
    }
  }

  static async getEventData(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const { eventScope } = req.body;

      // Validate eventScope
      if (!eventScope || !['PUBLIC', 'UNIVERSITY'].includes(eventScope)) {
        return res.status(400).json({
          success: false,
          message: ['eventScope must be either PUBLIC or UNIVERSITY'],
        });
      }

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
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to fetch event'] });
    }
  }

  static async registeredEvent(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const { eventId } = req.body;

      // Validate eventId
      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: ['eventId is required'],
        });
      }

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
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to register for event'] });
    }
  }

  static async getRegisteredStudents(req: AuthenticatedRequest, res: Response): Promise<any> {
    try {
      const { identityId } = req;
      const { id: eventId } = req.query;

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
      const {
        title,
        description,
        startTime,
        endTime,
        eventScope,
        timeZone,
        eventType,
        onlineLink,
        backgroundImage,
        termsCondition,
        venue,
      } = req.body;

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

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (startTime !== undefined) {
        if (isNaN(startTime)) {
          return res.status(400).json({
            success: false,
            message: ['Invalid startTime'],
          });
        }
        updateData.startTime = startTime;
      }
      if (endTime !== undefined) {
        if (isNaN(endTime)) {
          return res.status(400).json({
            success: false,
            message: ['Invalid endTime'],
          });
        }
        updateData.endTime = endTime;
      }
      if (startTime !== undefined && endTime !== undefined && startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: ['startTime must be before endTime'],
        });
      }
      if (eventScope !== undefined) {
        if (!['PUBLIC', 'UNIVERSITY'].includes(eventScope)) {
          return res.status(400).json({
            success: false,
            message: ['eventScope must be either PUBLIC or UNIVERSITY'],
          });
        }
        updateData.eventScope = eventScope;
      }
      if (timeZone !== undefined) {
        const validTimeZone = DateTime.local().setZone(timeZone).isValid;
        if (!validTimeZone) {
          return res.status(400).json({
            success: false,
            message: ['Invalid timeZone. Must be a valid IANA time zone (e.g., America/Los_Angeles)'],
          });
        }
        updateData.timeZone = timeZone;
      }
      if (eventType !== undefined) {
        if (!Object.values(EventTypeEnums).includes(eventType)) {
          return res.status(400).json({
            success: false,
            message: ['eventType must be either IN_PERSON, ONLINE, or HYBRID'],
          });
        }
        updateData.eventType = eventType;
      }
      if (onlineLink !== undefined) {
        updateData.onlineLink = onlineLink;
      }
      // Validate onlineLink based on eventType
      if (
        (eventType === EventTypeEnums.ONLINE || eventType === EventTypeEnums.HYBRID) &&
        (onlineLink === undefined || onlineLink === '')
      ) {
        return res.status(400).json({
          success: false,
          message: ['onlineLink is required for ONLINE or HYBRID events'],
        });
      }
      if (eventType === EventTypeEnums.IN_PERSON && onlineLink) {
        return res.status(400).json({
          success: false,
          message: ['onlineLink should not be provided for IN_PERSON events'],
        });
      }
      if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;
      if (termsCondition !== undefined) updateData.termsCondition = termsCondition;
      if (venue !== undefined) updateData.venue = venue;

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
      console.error(error);
      return res.status(500).json({ success: false, message: ['Unable to edit event'] });
    }
  }
}

export default EventController;
