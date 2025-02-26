import cron from 'node-cron';
import StudentModel from '../models/StudentModel.js';
import { sendEmailToVerifyGraduation } from '../utils/SendEmailVerification.js';
import { CronExpression } from '../utils/CronExpression.js';
import { differenceInMonths } from 'date-fns';

console.log('Worker started...');

const currentYear = new Date().getFullYear();

export async function sendEmailToVerifyGraduationCron  () {

  try {
    const graduatingStudents = await StudentModel.find({
      GraduationYear: currentYear,
      isdeleted: false,
      hasGraduated: false,
    },
    { email: 1, GraduationYear: 1 }
  )
    console.log(graduatingStudents,"graudation student")
    if (graduatingStudents.length > 0) {
      console.log(`Found ${graduatingStudents.length} students graduating in ${currentYear}:`);
      graduatingStudents.forEach((student) => {
        console.log(`Email: ${student.email}, Graduation Year: ${student.GraduationYear}`);
        sendEmailToVerifyGraduation(student.email);
      });
    } else {
      console.log(`No students graduating in ${currentYear}.`);
    }
  } catch (error) {
    console.error('Error in daily check:', error);
  }
}

cron.schedule(CronExpression.EVERY_DAY_AT_MIDNIGHT, () => {
  console.log('Running daily check for graduating students...');
  sendEmailToVerifyGraduationCron();
});


export async function SuspendStudentProfileGraduation() {
  try {
    const graduatingStudents = await StudentModel.find(
      {
        isdeleted: false,
        hasGraduated: true,
      },
      { email: 1, GraduationYear: 1, graduationVerifyTime: 1 }
    );

    const currentDate = new Date();

    for (const student of graduatingStudents) {
      const graduationVerifyTimedata = student.graduationVerifyTime;

      if (graduationVerifyTimedata && !isNaN(graduationVerifyTimedata.getTime())) {
        const monthsDifference = differenceInMonths(currentDate, graduationVerifyTimedata);

        if (monthsDifference > 6) {
          await StudentModel.updateOne(
            { _id: student._id },
            { $set: { suspend: true } }
          );
          console.log(`Suspended student with email: ${student.email}`);
        }
      } else {
        console.warn(`Invalid or missing graduationVerifyTime for student: ${student.email}`);
      }
    }

    console.log('Suspension check completed.');
  } catch (error) {
    console.error('Error in SuspendStudentProfileGraduation:', error);
  }
}

cron.schedule(CronExpression.EVERY_DAY_AT_MIDNIGHT, () => {
  console.log('Running suspension check for graduated students...');
  SuspendStudentProfileGraduation();
});