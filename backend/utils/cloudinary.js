import cloudinary from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

// Validate configuration on startup
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error("❌ FATAL ERROR: Cloudinary configuration is incomplete");
  console.error(
    "Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
  );
  process.exit(1);
}

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Delete an image from Cloudinary by public_id
 * @param {string} publicId - The Cloudinary public_id to delete
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    const result = await cloudinary.v2.uploader.destroy(publicId);
    console.log(`✅ Deleted from Cloudinary: ${publicId}`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error deleting ${publicId}:`, error.message);
    // Don't throw - we don't want to fail the request if deletion fails
  }
};

export default cloudinary.v2;
