import multer from "multer";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per image
const MAX_FILES = 5;

const ALLOWED_MIME_TYPES = new Set([
"image/jpeg",
"image/png",
"image/webp",
]);

export const imageUpload = multer({
storage: multer.memoryStorage(),

limits: {
fileSize: MAX_FILE_SIZE,
files: MAX_FILES,
fields: 10,
parts: 15,
},

fileFilter: (_req, file, callback) => {
if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
callback(
new Error("Only JPEG, PNG, and WebP images are allowed"),
);
return;
}


callback(null, true);


},
});
