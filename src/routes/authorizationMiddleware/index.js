import { PostgressRepository } from '../../postgresql/postgrees';
import jwt from 'jsonwebtoken';
import { parseJwt } from '../../utils/jwt';

const postgres = new PostgressRepository();

const authorizationMiddleware = async (req, res, next) => {
    console.log('Authorization middleware called for path:', req.path);
    
    // Skip authorization for OPTIONS requests and public endpoints
    const publicPaths = ['/api/users/login', '/api/test'];
    if (req.method === 'OPTIONS' || publicPaths.includes(req.path)) {
        console.log('Skipping auth for public endpoint:', req.path);
        next();
        return;
    }

    const bearerHeader = (req.headers['Authorization'] || req.headers['authorization'] || '');
    console.log('Authorization header:', bearerHeader);
    
    if (!bearerHeader) {
        console.log('No authorization header found');
        res.sendStatus(401); // Changed from 403 to 401 for missing auth
        return;
    }

    try {
        const token = bearerHeader.startsWith('Bearer ') ? bearerHeader.split(' ')[1] : bearerHeader;
        console.log('Extracted token:', token);
        
        const {document: username} = parseJwt(token);
        console.log('Parsed username:', username);
        
        const userResponse = await postgres.query('SELECT * FROM users WHERE document = $1', [username]);
        console.log('User found:', userResponse.rows[0]?.document);
        
        if (!userResponse.rows[0]) {
            console.log('User not found');
            res.status(401).send('User not found');
            return;
        }
        
        const { password, role } = userResponse.rows[0];
        const verified = jwt.verify(token, password);
        console.log('Token verified:', verified);
        
        if(!verified) {
            console.log('Token verification failed');
            res.status(401).send('Invalid token');
            return;
        }

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
            res.status(403).send('Forbidden');
        }
    } catch (error) {
        console.error('Authorization error:', error);
        res.status(401).send('Invalid token');
    }
};

export default authorizationMiddleware;