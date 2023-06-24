import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { schemaQuery } from "../../utils";

const router = Router();
const postgres = new PostgressRepository();
const TABLE = 'genotypes_by_reference_snp';
const ROUTE = '/genotypesByreferenceSnp'

router.get(ROUTE, async (req, res) => {
    try {
        const response = await postgres.query(`
            SELECT genotypes_by_reference_snp.id, reference_snp.rs_name as reference_snp, genotypes.genotype_name as genotype
            FROM genotypes_by_reference_snp
            LEFT OUTER JOIN genotypes ON genotypes_by_reference_snp.genotype = genotypes.id
            LEFT OUTER JOIN reference_snp ON genotypes_by_reference_snp.reference_snp = reference_snp.id
        `);
        res.json(response.rows);
    } catch (e) {
        res.status(500).send(e);
    }
});

router.get(`${ROUTE}/id/:id`, async (req, res) => {
    const { id } = req.params;
    try {
        const response = await postgres.query(`SELECT * FROM ${TABLE} WHERE reference_snp = $1`, [id]);
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
        console.log(e);
        res.status(500).send(e);
    }
});

router.post(ROUTE, async (req, res) => {
    const { genotype, reference_snp } = req.body;
    try {
        const response = await postgres.query(`INSERT INTO ${TABLE}(reference_snp, genotype) VALUES($1, $2) RETURNING id`, [reference_snp, genotype]);
        res.json({ message: 'Created', id: response.rows[0].id });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.put(ROUTE, async (req, res) => {
    const { id, genotype, reference_snp } = req.body;
    try {
        await postgres.query(`UPDATE ${TABLE} SET genotype = $1, reference_snp = $2 WHERE id = $3`, [genotype, reference_snp, id]);
        res.json({ message: 'Updated'});
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