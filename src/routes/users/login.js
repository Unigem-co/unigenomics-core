import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const postgres = new PostgressRepository();
const ROUTE = '/users/login';

router.post(ROUTE, async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResponse = await postgres.query('SELECT * FROM users WHERE document = $1', [username]);
        const user = userResponse.rows[0];
        if (user) {
            const hashedPassword = await bcrypt.compare(password, user.password);
            if (hashedPassword) {
                const newUser = { ...user };
                delete newUser.password;
                const token = jwt.sign(newUser, user.password, { ...(user.role === 'admin' ? {} : { expiresIn: '2h' }) });
                res.status(200).send({ token });
            } else {
                res.status(401).send('Incorrect user name or password.');
            }
        } else {
            res.status(401).send('Incorrect user name or password.');
        }
    } catch (error) {
        console.log("Error during login:", error);
        res.status(500).send(error);
    }
});

export default router;