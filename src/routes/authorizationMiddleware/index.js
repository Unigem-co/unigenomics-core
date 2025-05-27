import { PostgressRepository } from '../../postgresql/postgrees';
import jwt from 'jsonwebtoken';
import { parseJwt } from '../../utils/jwt';

const postgres = new PostgressRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authorizationMiddleware = async (req, res, next) => {
    console.log('Authorization middleware called for path:', req.path);
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return next();
    }

    const bearerHeader = req.headers.authorization;
    console.log('Authorization header:', bearerHeader);
    
    if (!bearerHeader || !bearerHeader.startsWith('Bearer ')) {
        console.log('Invalid or missing authorization header');
        res.status(401).json({ message: 'Authorization header required' });
        return;
    }

    try {
        const token = bearerHeader.split(' ')[1];
        console.log('Extracted token:', token);
        
        // First verify the token signature
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Decoded token:', decoded);
        
        if (!decoded.document) {
            console.log('Invalid token payload');
            res.status(401).json({ message: 'Invalid token' });
            return;
        }

        // Then check if user exists
        const userResponse = await postgres.query('SELECT * FROM users WHERE document = $1', [decoded.document]);
        console.log('User found:', userResponse.rows[0]?.document);
        
        if (!userResponse.rows[0]) {
            console.log('User not found');
            res.status(401).json({ message: 'User not found' });
            return;
        }
        
        const { role } = userResponse.rows[0];

        // Store user info in request for later use
        req.user = {
            document: decoded.document,
            role: role
        };

        if(role === 'admin') {
            console.log('Admin access granted');
            next();
            return;
        }

        const allowedEndpoints = ['report', 'generate-report'];
        const isAllowed = allowedEndpoints.some(endpoint => req.path.includes(endpoint));
        console.log('Non-admin access check:', { path: req.path, isAllowed });
        
        if (isAllowed) {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden' });
        }
    } catch (error) {
        console.error('Authorization error:', error);
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token expired' });
        } else if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ message: 'Invalid token' });
        } else {
            res.status(401).json({ message: 'Authentication failed' });
        }
    }
};

export default authorizationMiddleware;