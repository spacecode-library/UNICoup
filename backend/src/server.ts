import express, { Application, Request, Response } from "express";
import "dotenv/config";
import connectDB from "./config/connectdb.js";
import userRoutes from './routes/UserRoutes.js'
import studentRoutes from './routes/StudentRoutes.js'
import adminRoutes from './routes/AdminRoutes.js'
import merchantRoutes from './routes/MerchantRoutes.js'
import cors from 'cors';

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

app.get("/", (req: Request,res: Response): any => {
    return res.json({ message: "Hey, it's working " });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
