import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Cloudinary storage for Multer
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        return {
            folder: 'student_ids',
            format: file.mimetype.split('/')[1], // Extract format from mimetype (e.g., 'png', 'pdf')
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`, // Unique public ID
            detection: 'adv_face', // Enable Advanced Facial Attributes Detection
            ocr: 'adv_ocr' // Enable OCR Text Detection and Extraction
        };
    }
});

export const upload = multer({ storage });