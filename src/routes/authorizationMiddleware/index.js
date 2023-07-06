import { PostgressRepository } from '../../postgresql/postgrees';
import jwt from 'jsonwebtoken';
import { parseJwt } from '../../utils/jwt';
import { restart } from 'nodemon';

const postgres = new PostgressRepository();

const authorizationMiddleware = async (req, res, next) => {
    if (req.url === '/api/users/login' || req.url === '/api/test') {
        next();
    } else {
        const bearerHeader = (req.headers['Authorization'] || req.headers['authorization'] || '');
        if (bearerHeader) {
            try {
                const token = bearerHeader?.split(' ')[1];
                const {document: username} = parseJwt(token);
                const userResponse = await postgres.query('SELECT * FROM users WHERE document = $1', [username]);
                const { password, role } = userResponse.rows[0];
                const verified = jwt.verify(token, password);
                if(verified) {
                    if(role === 'admin') {
                        next();
                    } else {
                        const allowedEndpoints = ['report', 'generate-report'];
                        const isAllowed = allowedEndpoints.find(enpoint => req.path.includes(enpoint));
                        if (isAllowed) {
                            next();
                        } else {
                            res.status(403).send('Forbidden');
                        }
                    }
                } else {
                    res.status(403).send('Forbidden');
                }
            } catch (error) {
                res.status(403).send(error);
            }

        } else {
            res.sendStatus(403);
        }
    }
};

export default authorizationMiddleware;