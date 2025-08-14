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
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
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
        const uniqueName = uuidv4() + path.extname(part.originalFilename || '');
        return uniqueName;
      }
    });

    const [fields, files] = await form.parse(req);
    
    const uploadedFiles = [];
    
    // Handle multiple files
    const fileArray = Array.isArray(files.files) ? files.files : [files.files].filter(Boolean);
    
    fileArray.forEach(file => {
      const filename = path.basename(file.filepath);
      uploadedFiles.push({
        filename: filename,
        originalName: file.originalFilename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${filename}`
      });
    });

    console.log('Files uploaded:', uploadedFiles);
    res.status(200).json({ files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
}
