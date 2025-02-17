import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID ?? '',
    process.env.OAUTH_CLIENT_SECRET ?? '',
    'https://developers.google.com/oauthplayground'
);

// Set credentials for the OAuth2 client
oauth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN ?? '' });

// Function to get the access token
const getAccessToken = async (): Promise<string> => {
    const tokens = await oauth2Client.getAccessToken();
    return tokens.token ?? ''; // Fallback to empty string if no token is returned
};

// Create the transporter with explicit SMTP settings
let transporter: nodemailer.Transporter;

export const sendVerificationEmail = async (email: string, otp: string): Promise<void> => {
    try {
        // Get the access token
        const accessToken = await getAccessToken();

        // Ensure all required environment variables are provided
        const emailUser = process.env.EMAIL_USER ?? '';
        const clientId = process.env.OAUTH_CLIENT_ID ?? '';
        const clientSecret = process.env.OAUTH_CLIENT_SECRET ?? '';
        const refreshToken = process.env.OAUTH_REFRESH_TOKEN ?? '';

        // Configure the transporter
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL
            auth: {
                type: 'OAuth2',
                user: emailUser, // Ensure this is a string
                clientId: clientId, // Ensure this is a string
                clientSecret: clientSecret, // Ensure this is a string
                refreshToken: refreshToken, // Ensure this is a string
                accessToken: accessToken, // Include the resolved access token
            },
        });

        // Email content
        const mailOptions = {
            from: emailUser, // Ensure this is a string
            to: email,
            subject: 'Verify Your Student Email',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #007BFF, #00BFFF); padding: 20px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 24px;">UNICoup Student Verification</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px; line-height: 1.6;">Hello, Welcome to UNICoup</p>
                        <p style="font-size: 16px; line-height: 1.6;">Please use the following OTP to verify your student email:</p>
                        <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                            <h2 style="margin: 0; font-size: 28px; color: #007BFF;">${otp}</h2>
                        </div>
                        <p style="font-size: 14px; color: #777; text-align: center;">This OTP will expire in 10 minutes.</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                        <p style="margin: 0;">If you did not request this verification, please ignore this email.</p>
                    </div>
                </div>
            `,
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully');
    } catch (error) {
        console.error('Error sending verification email:', error);
    }
};