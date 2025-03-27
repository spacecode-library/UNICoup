import { Request, Response } from 'express';
import EventModel from '../models/EventModel.js';
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

    static async createEvent(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {identityId} = req;
            const {title,description,startTime,endTime,backgroundImage,termsCondition,venue,eventScope} = req.body;

            if(!title || !description || !startTime || !endTime || !backgroundImage || !termsCondition || !venue || !eventScope
            ){
                return res.status(403).json({
                    success:false,
                    messaage:["All field are required"],

                })
            }

            const newEvent = new EventModel({
                userId:identityId,
                title,
                description,
                startTime,
                endTime,
                eventScope,
                backgroundImage,
                termsCondition,
                venue
            })

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
    const { status, eventScope } = req.body;

    // Define the query
    const query: any = { status, eventScope, isDeleted: false };

    // Only filter by userId if eventScope is not PUBLIC
    if (eventScope !== 'PUBLIC') {
      query.userId = identityId;
    }

    const eventData = await EventModel.find(query);

    if (eventData.length == 0) {
      return res.status(403).json({
        success: false,
        message: ['No data found'],
        data: {},
      });
    }

    return res.status(200).json({
      success: true,
      message: ['Event Data fetch successfully'],
      data: eventData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: ['Unable to fetch event'] });
  }
}

    static async registeredEvent (req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {identityId} = req;
            const {eventId} = req.body;
            const studentData = await StudentModel.findOne(
                {userid:identityId,isdeleted:false},
                {_id:1,userid:1}
            )

            if(!studentData){
                return res.status(403).json({
                    success:false,
                    message:['Student not found'],
                    data:{}
                })
            }
            const registeredStudent  = new RegisteredEventModel({
                userId:identityId,
                eventId:eventId
            })

            await registeredStudent.save();
            return res.status(201).json({
                success: true,
                message: ['Event registred successfully'],
                data: registeredStudent,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to registered event'] });
        }
    }

    static async getRegisteredStudentData (req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {id}= req.params;

            const eventData = await EventModel.findOne(
                {_id:id,isDeleted:false},
                {_id:1}
            )

            if(!eventData){
                return res.status(403).json({
                    success:false,
                    message:['No data found'],
                    data:{}
                })
            }
            const registeredStudentData = await RegisteredEventModel.find(
                {eventId:eventData._id,isDeleted:false}
            )

            const userids = [];
            registeredStudentData.map(item => userids.push(item.userId))

            const studentData = await UserModel.find(
                {_id: {$in:userids},isdeleted:false},
                {name:1,email:1}
            )
            
            return res.status(200).json({
                success:true,
                message:['Registered student data'],
                data:studentData
            })
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to get student data'] });
        }
    }

    static async deleteEvent(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {

            const {id} = req.params;

            const eventData = await EventModel.findOne(
                {_id:id,isDeleted:false}
            )

            if(!eventData){
                return res.status(403).json({
                    success:true,
                    message:['No data found'],
                    data:{}
                })
            }

            await EventModel.findByIdAndUpdate(
                {_id:eventData._id},{isDeleted:true},{new:true}
            )
            return res.status(200).json({
                success:true,
                message:['data deleted successfully'],
                data: {
                    eventId : eventData._id
                }
            })
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to delete event.'] });
        }
    }

    static async eventEdit(req:AuthenticatedRequest,res:Response):Promise<any>{
        try {
            const {identityId} = req;
            const {id} = req.params;
            const {title,description,startTime,endTime,backgroundImage,termsCondition,venue,eventScope} = req.body;
            
            const eventData = await EventModel.findOne(
                {_id:id,userId:identityId,isDeleted:false}
            )

            if(!eventData){
                return res.status(403).json({
                    success:false,
                    message:['no data found'],
                    data:{}
                })
            }

            const updateData: any = {};
        
            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;
            if (startTime !== undefined) updateData.startTime = startTime;
            if (endTime !== undefined) updateData.endTime = endTime;
            if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage;
            if (termsCondition !== undefined) updateData.termsCondition = termsCondition;
            if (venue !== undefined) updateData.venue = venue;
            if (eventScope !== undefined) updateData.eventScope = eventScope;

            const updatedEvent = await EventModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true } 
            );

            return res.status(200).json({
                success: true,
                message: ['Event updated successfully'],
                data: updatedEvent
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: ['Unable to edit event.'] });
        }
    }
}


export default EventController;
