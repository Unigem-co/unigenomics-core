import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { readableDate, schemaQuery } from "../../utils";
import bcrypt from 'bcrypt';

const router = Router();
const postgres = new PostgressRepository();
const ROUTE = '/users/user';
const TABLE = 'users';


router.get(ROUTE, async (req, res) => {
    const { username } = req.params;
    try {
        const userResponse = await postgres.query(`SELECT * FROM ${TABLE}`, []);
        const users = userResponse.rows;
        res.json(users.map(user => {
            user.password = '';
            const date = readableDate(user.birdth_date);
            return {
                ...user,
                birdth_date: date
            };
        }));
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get(`${ROUTE}/username/:username`, async (req, res) => {
    const { username } = req.params;
    try {
        const userResponse = await postgres.query(`SELECT * FROM ${TABLE} WHERE document = $1`, [username]);
        const user = userResponse.rows[0];
        if(user){
            res.json(user);
        } else {
            res.status(500).send({error: 'User not found'});
        }
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get(`${ROUTE}/schema`, async (req, res) => {
    try {
        const response = await postgres.query(schemaQuery(TABLE));
        const schema = response.rows;
        res.json(schema);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});


router.post(ROUTE, async (req, res) => {
    const { name, last_names, document_type, document, birdth_date, role, prime_id } = req.body;
    const salt = await bcrypt.genSalt();
    const newPassword = await bcrypt.hash(document, salt);
    try {
        const response = await postgres.query(
            `
                INSERT INTO ${TABLE}(name, last_names, document_type, document, birdth_date, password, role, prime_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `,
            [name, last_names, document_type, document, birdth_date, newPassword, role, prime_id]
        );
        res.json({ message: 'Created', id: response.rows[0].id });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.put(ROUTE, async (req, res) => {
    const { name, last_names, document_type, document, birdth_date, password, role, prime_id } = req.body;
    const salt = await bcrypt.genSalt();
    const newPassword = password
        ? await bcrypt.hash(password, salt)
        : await bcrypt.hash(document, salt);
    try {
        await postgres.query(
            `UPDATE ${TABLE} SET name=$1, last_names=$2, document_type=$3, document=$4, birdth_date=$5, password=$6, role=$7, prime_id=$8 WHERE document = $4`,
            [name, last_names, document_type, document, birdth_date, newPassword, role, prime_id]
        );
        res.json({ message: 'Updated' });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.delete(ROUTE, async (req, res) => {
    const { id } = req.body;
    try {
        const response = await postgres.query(`DELETE FROM ${TABLE} WHERE id = $1 RETURNING id`, [id]);
        res.json({ message: 'deleted', id: response.rows[0].id });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});




export default router;