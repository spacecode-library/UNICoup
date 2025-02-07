import express, { Request, Response } from "express";
import { Resend } from "resend";

const app = express();
const resend = new Resend("re_UKVUguL5_6aKHyaCZ9YcaarV2Hz6ehtcD");

const sendEmailVerificationOTP = async (email:string,otp:string) => {

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
export default sendEmailVerificationOTP;
