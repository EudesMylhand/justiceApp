const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PLAINTES_SUBDIR = 'plaintes';
const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10;

const fullUploadPath = path.join(process.cwd(), UPLOAD_DIR, PLAINTES_SUBDIR);
if (!fs.existsSync(fullUploadPath)) {
    fs.mkdirSync(fullUploadPath, { recursive: true });
}

// Types de fichiers autorisés : documents et images courants utiles à un dossier de plainte
const TYPES_AUTORISES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fullUploadPath);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const nomUnique = `${crypto.randomUUID()}${extension}`;
        cb(null, nomUnique);
    },
});

function fileFilter(req, file, cb) {
    if (TYPES_AUTORISES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('TYPE_FICHIER_NON_AUTORISE'));
    }
}

const uploadPieceJointe = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

module.exports = { uploadPieceJointe, PLAINTES_SUBDIR, UPLOAD_DIR };
