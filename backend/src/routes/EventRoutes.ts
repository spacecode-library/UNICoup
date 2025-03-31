import { Router } from 'express';
import { StudentMW } from '../middleware/StudentMW.js';
import EventController from '../controllers/EventController.js';

const router = Router();


// Create a new event

// Requires authentication via StudentMW
// Request Body: { title, description, venue, startTime, endTime, eventScope, timeZone, eventType, onlineLink, termsCondition, backgroundImage }
// - eventScope: 'PUBLIC' or 'UNIVERSITY'
// - If eventScope is 'UNIVERSITY', the event will include the student's universityName and universityDomain
router.post('/create', StudentMW, EventController.createEvent);

// Fetch events based on eventScope
// Requires authentication via StudentMW
// Query Parameters: { eventScope }
// - eventScope: 'PUBLIC' or 'UNIVERSITY' (required)
// - For 'UNIVERSITY', only events matching the student's universityDomain are returned
router.get('/events', StudentMW, EventController.getEventData);

// Register a student for an event
// Requires authentication via StudentMW
// Request Body: { eventId }
// - eventId: The ID of the event to register for
router.post('/register', StudentMW, EventController.registeredEvent);

// Fetch registered students for an event
// Requires authentication via StudentMW
// Query Parameters: { id }
// - id: The eventId to fetch registered students for
// - Only the event creator can view registrations for non-PUBLIC events
router.get('/registered', StudentMW, EventController.getRegisteredStudents);

// Delete an event
// Requires authentication via StudentMW
// Path Parameters: { id }
// - id: The eventId to delete
// - Only the event creator can delete the event
router.delete('/:id', StudentMW, EventController.deleteEvent);

// Update an event
// Requires authentication via StudentMW
// Path Parameters: { id }
// Request Body: { title, description, startTime, endTime, eventScope, timeZone, eventType, onlineLink, backgroundImage, termsCondition, venue }
// - id: The eventId to update
// - Only the event creator can update the event
// - If eventScope is updated to 'UNIVERSITY', the event will include the student's universityName and universityDomain
router.put('/:id', StudentMW, EventController.eventEdit);

export default router;
