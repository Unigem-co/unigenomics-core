import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { schemaQuery } from "../../utils";

const router = Router();
const postgres = new PostgressRepository();
const REPORTS_TABLE = 'reports';
const REPORTS_DETAIL_TABLE = 'reports_detailed';
const REFERENCES_TABLE = 'reference_snp';
const ROUTE = '/report';

const genotypesByrsQuery = `
    SELECT reference_snp.id as rs_id, genotypes.id as genotype_id, genotypes.genotype_name
    FROM interpretations 
    INNER JOIN reference_snp ON interpretations.reference_snp = reference_snp.id
    INNER JOIN genotypes ON interpretations.genotype = genotypes.id 
`;

router.get(ROUTE, async (req, res) => {
    try {
        const referencesResponse = await postgres.query(`SELECT id, rs_name FROM ${REFERENCES_TABLE}`, []);
        const referencesSnp = referencesResponse.rows;
        const genotypesByReferencesResponse = await postgres.query(genotypesByrsQuery, []);
        const genotypesByReferences = genotypesByReferencesResponse.rows;
        const referencesWithGenotypes = referencesSnp.map(snp => ({
            ...snp,
            genotypes: genotypesByReferences.filter(genotypeByReferences => genotypeByReferences.rs_id === snp.id)
        }));

        res.json(referencesWithGenotypes);
    } catch(error) {
        console.log(error);
        res.status(500).send(error);
    }
});

router.get(`${ROUTE}/schema`, async (req, res) => {
    try {
        const response = await postgres.query(schemaQuery(REPORTS_DETAIL_TABLE));
        res.json(response.rows);
    } catch (e) {
        console.log(e)
        res.status(500).send(e);
    }
});

router.post(ROUTE, async (req, res) => {
    const { user, reportDate, detail } = req.body;
    try {
        const reportResponse = await postgres.query(`
            INSERT INTO ${REPORTS_TABLE}("user", "report_date") 
            VALUES ($1, $2)
            RETURNING id
        `, [user, reportDate]);
        const reportId = reportResponse.rows[0].id;
        const valuesQuery = Object.keys(detail).map((_, index) => `($1, $${index*2+2}, $${index*2+3})`).join(',');
        const params = Object.keys(detail).reduce((prev, curr) => ([
            ...prev, curr, detail[curr]
        ]), []);
        await postgres.query(`INSERT INTO ${REPORTS_DETAIL_TABLE}(parent, reference_snp, result) VALUES ${valuesQuery}`, [reportId, ...params]);
        res.status(200).send({message: 'Created'});
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

export default router;