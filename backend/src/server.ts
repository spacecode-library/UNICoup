import express, { Application, Request, Response } from "express";
import "dotenv/config";
import connectDB from "./config/connectdb.js";
import userRoutes from './routes/UserRoutes.js'
import studentRoutes from './routes/StudentRoutes.js'
import adminRoutes from './routes/AdminRoutes.js'
import merchantRoutes from './routes/MerchantRoutes.js'
import discountRoutes from './routes/DiscountRoutes.js'
import paymentRoutes from './routes/PaymentRoutes.js'
import cors from 'cors';
import { sendEmailToVerifyGraduationCron } from "./worker/StudentWorker.js";

const app: Application = express();
const PORT = process.env.PORT || 7000;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors( {origin:"*"}))

// Database Connection
connectDB(DATABASE_URL)

// JSON
app.use(express.json())

// Load Routes
app.use("/api/user",userRoutes)

// Student Routes
app.use("/api/student",studentRoutes)

// Admin Routes
app.use("/api/admin",adminRoutes)

// Merchant Routes
app.use("/api/merchant",merchantRoutes)

//Discount Routes
app.use("/api/discount",discountRoutes)

//Payment Routes
app.use("/api/payment",paymentRoutes)

//worker
sendEmailToVerifyGraduationCron();

app.get("/", (req: Request,res: Response): any => {
    return res.json({ message: "Hey, it's working " });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
