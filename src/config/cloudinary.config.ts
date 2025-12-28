import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
    url: string;
    public_id: string;
    format: string;
    resource_type: string;
    bytes: number;
    duration?: number; // For video/audio
}

// Upload file from buffer (for multer memory storage)
export const uploadToCloudinary = async (
    buffer: Buffer,
    options: {
        folder?: string;
        resource_type?: 'image' | 'video' | 'raw' | 'auto';
        format?: string;
    } = {}
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: options.folder || 'chat-app',
                resource_type: options.resource_type || 'auto',
                format: options.format,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                        format: result.format,
                        resource_type: result.resource_type,
                        bytes: result.bytes,
                        duration: result.duration,
                    });
                }
            }
        );

        const stream = Readable.from(buffer);
        stream.pipe(uploadStream);
    });
};

// Upload from URL
export const uploadFromUrl = async (
    url: string,
    options: {
        folder?: string;
        resource_type?: 'image' | 'video' | 'raw' | 'auto';
    } = {}
): Promise<UploadResult> => {
    const result = await cloudinary.uploader.upload(url, {
        folder: options.folder || 'chat-app',
        resource_type: options.resource_type || 'auto',
    });

    return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        duration: result.duration,
    };
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result.result === 'ok';
    } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        return false;
    }
};

export default cloudinary;
