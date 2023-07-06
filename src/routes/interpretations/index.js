import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { schemaQuery } from "../../utils";

const router = Router();
const postgres = new PostgressRepository();
const TABLE = 'interpretations';
const ROUTE = '/interpretation';

router.get(ROUTE, async (req, res) => {
    try {
        const response = await postgres.query(`
            SELECT interpretations.id, 
                   reference_snp.rs_name as reference_snp, 
                   genotypes.genotype_name as genotype, 
                   genotype_effects.name as genotype_effect,
                   interpretations.interpretation
            FROM interpretations
            LEFT OUTER JOIN reference_snp ON reference_snp.id = interpretations.reference_snp
            LEFT OUTER JOIN genotypes ON genotypes.id = interpretations.genotype
            LEFT OUTER JOIN genotype_effects ON interpretations.genotype_effect = genotype_effects.id
        `, []);
        res.json(response.rows);
    } catch (e) {
        res.status(500).send(e);
    }
});

router.get(`${ROUTE}/findResultInterpretation/:rs/:genotype`, async (req, res) => {
    const { params: { rs, genotype }} = req;
    try {
        const response = await postgres.query(`
            SELECT interpretations.interpretation
            FROM interpretations
            WHERE reference_snp = $1 AND genotype = $2
        `, [rs, genotype]);
        res.json(response.rows[0]);
    } catch (e) {
        console.log(e);
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
    const { reference_snp, genotype, interpretation, genotype_effect } = req.body;
    try {
        const response = await postgres.query(
            `INSERT INTO ${TABLE}(reference_snp, genotype, interpretation) VALUES($1, $2, $3, $5) RETURNING id`, 
            [reference_snp, genotype, interpretation, genotype_effect]
        );
        res.send({ message: 'Created', id: response.rows[0].id });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.put(ROUTE, async (req, res) => {
    const { reference_snp, genotype, interpretation, genotype_effect, id } = req.body;
    try {
        await postgres.query(
            `UPDATE ${TABLE} SET reference_snp = $1, genotype = $2, interpretation = $3, genotype_effect = $5 WHERE id = $4`, 
            [reference_snp, genotype, interpretation, id, genotype_effect]
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
