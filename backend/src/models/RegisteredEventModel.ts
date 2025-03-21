import mongoose,{Schema,Document} from 'mongoose';


export interface IRegisteredEvent extends Document {
    _id : string;
    userId : string;
    eventId:string;
    isDeleted: boolean;
}

const RegisteredEventSchema:Schema = new Schema (
    {
        _id : {type:String,default: () => new mongoose.Types.ObjectId().toString()},
        userId : {type:String, required:true,trim:true},
        eventId : {type:String, required:true,trim:true},
        isDeleted: { type: Boolean, default: false },
    }
)

const RegisteredEventModel = mongoose.model<IRegisteredEvent>("RegisteredEvent", RegisteredEventSchema);
export default RegisteredEventModel;