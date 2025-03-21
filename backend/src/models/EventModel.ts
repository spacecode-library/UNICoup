import mongoose,{Schema,Document} from 'mongoose';
import { EventStatusEnums } from '../constants/EnumTypes.js';


export interface IEvent extends Document {
    _id : string;
    userId : string;
    startTime : number;
    endTime : number;
    title : string;
    description : string;
    backgroundImage : string;
    termsCondition : string;
    venue : string;
    status : string;
    eventScope : string;
    isDeleted: boolean;
}

const EventSchema:Schema = new Schema (
    {
        _id : {type:String,default: () => new mongoose.Types.ObjectId().toString()},
        userId : {type:String, required:true,trim:true},
        startTime : {type:Number,required:true},
        endTime:{type:Number , required:true},
        title:{type:String, required:true},
        description : {type:String,required:true},
        backgroundImage:{type:String,required:true},
        termsCondition:{type:String,required:true},
        venue:{type:String,required:true},
        status : {type:String, default:EventStatusEnums.Upcoming},
        eventScope:{type:String,required:true},
        isDeleted: { type: Boolean, default: false },
    }
)

const EventModel = mongoose.model<IEvent>("Event", EventSchema);
export default EventModel;