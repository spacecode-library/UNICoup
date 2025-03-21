import { Router } from "express";
import { StudentMW } from "../middleware/StudentMW.js";
import EventController from "../controllers/EventController.js";

const router = Router();

// Public Routes

router.post("/create",StudentMW,EventController.createEvent);

router.post("/",StudentMW,EventController.getEventData);

router.post("/registered",StudentMW,EventController.registeredEvent);
// ?id=eventid params
router.get("/",StudentMW,EventController.getRegisteredStudentData);
// ?id=eventid params
router.delete("/delete",StudentMW,EventController.deleteEvent);
// ?id=eventid params
router.put("/edit",StudentMW,EventController.eventEdit)


export default router;