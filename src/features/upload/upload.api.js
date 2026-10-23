import { api } from '../../lib/api';

// Reads a File as a base64 data URL and posts it to the backend /upload
// endpoint, which uploads it to the Supabase Storage bucket (or local disk fallback)
// and returns a public fileUrl.
export async function uploadFile(file, folder = 'applicants') {
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await api.post('/upload', { base64Data, fileName: file.name, folder });
  return res.fileUrl;
}

