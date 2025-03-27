import { Router } from 'express';
import { StudentMW } from '../middleware/StudentMW.js';
import EventController from '../controllers/EventController.js';

const router = Router();

// Public Routes
router.post('/create', StudentMW, EventController.createEvent);
router.post('/', StudentMW, EventController.getEventData);
router.post('/register', StudentMW, EventController.registeredEvent);
router.get('/', StudentMW, EventController.getRegisteredStudents); // GET /event?id=eventId
router.delete('/:id', StudentMW, EventController.deleteEvent); // DELETE /event/:id
router.put('/:id', StudentMW, EventController.eventEdit); // PUT /event/:id

export default router;
