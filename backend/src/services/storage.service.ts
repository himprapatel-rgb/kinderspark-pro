import { v2 as cloudinary } from 'cloudinary'

function configured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
}

function ensureConfig(): void {
  if (!configured()) {
    throw new Error('Cloudinary is not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)')
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export async function uploadDrawingBuffer(
  studentId: string,
  base64Image: string
): Promise<{ url: string; thumbUrl: string; publicId: string }> {
  ensureConfig()
  const dataUri = base64Image.startsWith('data:') ? base64Image : `data:image/png;base64,${base64Image}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `kinderspark/drawings/${studentId}`,
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  })

  const thumbUrl = cloudinary.url(result.public_id, {
    width: 200,
    height: 200,
    crop: 'fill',
    fetch_format: 'auto',
    secure: true,
  })

  return { url: result.secure_url, thumbUrl, publicId: result.public_id }
}

export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  if (!publicId) return
  if (!configured()) return
  ensureConfig()
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
}
