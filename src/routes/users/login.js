import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const postgres = new PostgressRepository();
const ROUTE = '/users/login';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post(ROUTE, async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            message: 'Usuario y contraseña son requeridos' 
        });
    }

    try {
        const userResponse = await postgres.query('SELECT * FROM users WHERE document = $1', [username]);
        const user = userResponse.rows[0];
        
        if (!user) {
            return res.status(401).json({ 
                message: 'Usuario o contraseña incorrectos' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Usuario o contraseña incorrectos' 
            });
        }

        // Create token payload
        const tokenPayload = {
            id: user.id,
            document: user.document,
            role: user.role,
            name: user.name
        };

        // Sign token with consistent secret
        const token = jwt.sign(
            tokenPayload, 
            JWT_SECRET,
            { expiresIn: user.role === 'admin' ? '24h' : '2h' }
        );

        res.status(200).json({ 
            token,
            user: {
                id: user.id,
                document: user.document,
                role: user.role,
                name: user.name
            }
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ 
            message: 'Error interno del servidor' 
        });
    }
});

export default router;