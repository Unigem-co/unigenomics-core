import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";

const router = Router();
const postgres = new PostgressRepository();
const REPORTS_TABLE = 'reports';
const ROUTE = '/report';

router.get(ROUTE, async (req, res) => {
    const response = await postgres.query(`SELECT * FROM ${REPORTS_TABLE}`);
    res.json(response.rows);
});

export default router;