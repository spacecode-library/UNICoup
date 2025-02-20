import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import 'dotenv/config';

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
            folder: 'merchant_certificates',
            format: file.mimetype.split('/')[1], // Extract format from mimetype (e.g., 'png', 'pdf')
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`, // Unique public ID
        };
    }
});
export const uploadmerchantdocs = multer({ storage })