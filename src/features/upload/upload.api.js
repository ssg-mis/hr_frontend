import { api } from '../../lib/api';

// Reads a File as a base64 data URL and posts it to the backend /upload
// endpoint, which uploads it to the Supabase Storage bucket (or local disk fallback)
// and returns a public fileUrl.
// Phone photos (2–5 MB) are shrunk to a ≤1600px JPEG before upload — the server's nginx
// rejects requests over ~1 MB. Non-images and small images go as they are.
const MAX_SIDE = 1600;
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || file.size <= 500 * 1024) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNG -> white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // browser can't decode it (e.g. HEIC on Chrome) — send the original
  }
}

export async function uploadFile(original, folder = 'applicants') {
  const file = await shrinkImage(original);
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const res = await api.post('/upload', { base64Data, fileName: file.name, folder });
    return res.fileUrl;
  } catch (err) {
    // A too-large request is cut off by nginx (413 without CORS), which the browser reports as "Failed to fetch"
    if (!err.status && file.size > 700 * 1024) {
      throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB) — please upload a smaller file`);
    }
    throw err;
  }
}

