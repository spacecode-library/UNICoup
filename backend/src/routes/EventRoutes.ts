import { Router } from 'express';
import { StudentMW } from '../middleware/StudentMW.js';
import EventController from '../controllers/EventController.js';

const router = Router();

// Public Routes
router.post('/create', StudentMW, EventController.createEvent);
router.post('/', StudentMW, EventController.getEventData);
router.post('/register', StudentMW, EventController.registeredEvent); // Changed to /register to avoid confusion
router.get('/', StudentMW, EventController.getRegisteredStudents); // Matches GET /event?id=<eventId>
router.delete('/:id', StudentMW, EventController.deleteEvent); // Matches DELETE /event/:id
router.put('/:id', StudentMW, EventController.eventEdit); // Matches PUT /event/:id

export default router;
