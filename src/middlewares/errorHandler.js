/**
 * Middleware global de gestion des erreurs.
 * À placer en dernier dans la chaîne de middlewares Express.
 */
function errorHandler(err, req, res, next) {
    console.error('💥 Erreur :', err);

    if (err.name === 'AuthError') {
        return res.status(400).json({ error: err.code, message: err.message });
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'DOUBLON',
            message: 'Une entrée avec ces informations existe déjà (matricule, email ou code en double).',
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'VALIDATION_ECHOUEE', message: err.message, details: err.details });
    }

    // Erreurs liées à l'upload de fichiers (multer)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'FICHIER_TROP_VOLUMINEUX',
            message: 'Le fichier dépasse la taille maximale autorisée.',
        });
    }
    if (err.message === 'TYPE_FICHIER_NON_AUTORISE') {
        return res.status(400).json({
            error: 'TYPE_FICHIER_NON_AUTORISE',
            message: 'Ce type de fichier n\'est pas autorisé. Formats acceptés : images, PDF, Word.',
        });
    }

    return res.status(500).json({
        error: 'ERREUR_SERVEUR',
        message: 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.',
    });
}

module.exports = { errorHandler };
