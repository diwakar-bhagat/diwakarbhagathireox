import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../public");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const filename = Date.now() + "-" + file.originalname;
    cb(null, filename);
  },
});

const isPdfFile = (file) => {
  const isPdfMime = file?.mimetype === "application/pdf";
  const hasPdfExtension =
    typeof file?.originalname === "string" && file.originalname.toLowerCase().endsWith(".pdf");
  return isPdfMime && hasPdfExtension;
};

const isImageFile = (file) => {
  const allowedMimes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
  const isImageMime = allowedMimes.has(file?.mimetype);
  const hasImageExtension =
    typeof file?.originalname === "string" &&
    /\.(png|jpe?g|webp)$/i.test(file.originalname.toLowerCase());
  return isImageMime && hasImageExtension;
};

const resumeFileFilter = (req, file, cb) => {
  if (isPdfFile(file)) {
    cb(null, true);
    return;
  }
  cb(new Error("Only PDF files are allowed."));
};

const jdFileFilter = (req, file, cb) => {
  if (isPdfFile(file) || isImageFile(file)) {
    cb(null, true);
    return;
  }
  cb(new Error("Only PDF or image files are allowed for JD upload."));
};

export const upload = multer({
  storage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE },
});

export const uploadJd = multer({
  storage,
  fileFilter: jdFileFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE },
});
