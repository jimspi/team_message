import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const form = formidable({
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    filename: (name, ext, part) => {
      return uuidv4() + path.extname(part.originalFilename || '');
    }
  });

  try {
    const [fields, files] = await form.parse(req);
    
    const uploadedFiles = [];
    Object.values(files).flat().forEach(file => {
      uploadedFiles.push({
        filename: path.basename(file.filepath),
        originalName: file.originalFilename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${path.basename(file.filepath)}`
      });
    });

    res.status(200).json({ files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
}
