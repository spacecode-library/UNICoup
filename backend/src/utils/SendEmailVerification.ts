import express, { Request, Response } from "express";
import { Resend } from "resend";

const app = express();
const resend = new Resend("re_UKVUguL5_6aKHyaCZ9YcaarV2Hz6ehtcD");

export const sendEmailVerificationOTP = async (email:string,otp:string) => {

  const { data, error } = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>",
    to: email,
    subject: "UnicoUp Verification Code",
    html: `Your Unicoup verification code is ${otp}`,
  });

  if (error) {
    return false;
  }

  return true;
};
// export default sendEmailVerificationOTP;

export const sendEmailToVerifyGraduation = async (email:string) => {
  const {data , error} = await resend.emails.send({
    from: "Acme <onboarding@resend.dev>",
    to:email,
    subject: "Verify Graduation",
    html: 'Confirm your graduation by visiting the campus club app. If no confirmation is received, your profile will be suspended.'
  })
  if(error){
    return false;
  }
  return true;
}
// export default {sendEmailToVerifyGraduation};