import mongoose from "mongoose";

const connectDB = async (DATABASE_URL:string) => {
    try {
        const DB_OPTIONS = {
            dbName: process.env.DB_NAME,
        }
        await mongoose.connect(DATABASE_URL, DB_OPTIONS);
        console.log("Database connected successfully");
    } catch (error) {
        console.log("Error connecting to database: ", error);
    }
}

export default connectDB; 