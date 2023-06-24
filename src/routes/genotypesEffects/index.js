import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { schemaQuery } from "../../utils";

const router = Router();
const postgres = new PostgressRepository();
const TABLE = 'genotype_effects';
const ROUTE = '/genotypeEffect';

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
    const { name } = req.body;
    try {
        const response = await postgres.query(`INSERT INTO ${TABLE}(name) VALUES($1) RETURNING id`, [name]);
        res.json({ message: 'Created', id: response.rows[0].id });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.put(ROUTE, async (req, res) => {
    const { name, id } = req.body;
    try {
        await postgres.query(`UPDATE ${TABLE} SET name = $1 WHERE id = $2`, [name, id]);
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
