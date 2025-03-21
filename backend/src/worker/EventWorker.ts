import cron from 'node-cron';
import { CronExpression } from '../utils/CronExpression.js';
import EventModel from '../models/EventModel.js';
import { EventStatusEnums } from '../constants/EnumTypes.js';

console.log('Worker started event ...');


export async function eventstatusupdatecronjob () {

  try {

    const currentTime = Math.floor(Date.now() / 1000);

    const eventDataUpcoming = await EventModel.find(
        {status:EventStatusEnums.Upcoming,isDeleted:false},
    );

    const eventDataLive = await EventModel.find(
        {status:EventStatusEnums.Live,isDeleted:false},
    )

    for(const item of eventDataUpcoming){
        if(item.startTime == currentTime){
            await EventModel.updateOne(
                { _id: item._id },
                { $set: { status: EventStatusEnums.Live } }
            );
        }
    }
    for(const item of eventDataLive){
        if(item.endTime == currentTime){
            await EventModel.updateOne(
                { _id: item._id },
                { $set: { status: EventStatusEnums.Completed } }
            );
        }
    }    
  } catch (error) {
    console.error('Error in event status check:', error);
  }
}

cron.schedule(CronExpression.EVERY_MINUTE, () => {
  console.log('event status update cron job...');
  eventstatusupdatecronjob();
});

