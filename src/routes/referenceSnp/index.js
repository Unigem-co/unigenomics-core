import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { schemaQuery } from "../../utils";

const router = Router();
const postgres = new PostgressRepository();
const TABLE = 'reference_snp';
const ROUTE = '/referenceSnp';

router.get(ROUTE, async (req, res) => {
    try {
        const response = await postgres.query(`SELECT * FROM ${TABLE}`);
        res.json(response.rows);
    } catch (e) {
        res.status(500).send(e);
    }
});

router.get(`${ROUTE}/schema`, async (req, res) => {
    try {
        const response = await postgres.query(schemaQuery(TABLE));
        res.json(response.rows);
    } catch (e) {
        res.status(500).send(e);
    }
});


router.post(ROUTE, async (req, res) => {
    const { rs_name, references } = req.body;
    try {
        const response = await postgres.query(
            `
                INSERT INTO ${TABLE}(rs_name, "references") 
                VALUES ($1, $2)
                RETURNING id
            `, 
            [rs_name, references]
        );
        res.json({ message: 'Created', id: response.rows[0].id });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.put(ROUTE, async (req, res) => {
    const { rs_name, references, id } = req.body;
    try {
        await postgres.query(
            `UPDATE ${TABLE} SET rs_name = $1, "references" = $2 WHERE id = $3`, 
            [rs_name, references, id]
        );
        res.json({ message: 'Updated' });
    } catch (e) {
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
