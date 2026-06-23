'use strict';
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smarttask_dev_secret_TUKAR_DI_PRODUKSI';

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Akses ditolak. Token pengesahan tidak disediakan.' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token tidak sah atau telah tamat tempoh. Sila log masuk semula.' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Pengesahan diperlukan.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Akses ditolak. Diperlukan peranan: ${roles.join(' atau ')}.`
            });
        }
        next();
    };
}

module.exports = { verifyToken, requireRole, JWT_SECRET };
