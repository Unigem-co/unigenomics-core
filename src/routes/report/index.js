import { Router } from "express";
import { PostgressRepository } from "../../postgresql/postgrees";
import { schemaQuery } from "../../utils";
import { readableDate } from '../../utils';

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
        const referencesSnp = (await postgres.query(`SELECT id, rs_name FROM ${REFERENCES_TABLE}`, [])).rows;
        const genotypesByReferences = (await postgres.query(genotypesByrsQuery, [])).rows;
        const referencesWithGenotypes = referencesSnp.map(snp => ({
            ...snp,
            genotypes: genotypesByReferences.filter(genotypeByReferences => genotypeByReferences.rs_id === snp.id)
        }));

        res.json(referencesWithGenotypes);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

router.get(`${ROUTE}/userReports/:id`, async (req, res) => {
    const { params: { id } } = req;
    try {
        const reports = (await postgres.query(`SELECT id, report_date, sampling_date, observations FROM ${REPORTS_TABLE} WHERE "user" = $1 ORDER BY report_date DESC`, [id])).rows;
        const reportsResponse = reports.map(report => ({
            id: report.id,
            report_date: readableDate(report.report_date),
            sampling_date: readableDate(report.sampling_date),
            observations: report.observations
        }));
        res.json(reportsResponse);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

router.get(`${ROUTE}/detailed/:id`, async (req, res) => {
    const { params: { id } } = req;
    try {
        const reportsDetailed = (await postgres.query(
            `SELECT ${REPORTS_DETAIL_TABLE}.*, interpretations.interpretation, reference_snp.rs_name
             FROM ${REPORTS_DETAIL_TABLE} 
             INNER JOIN interpretations 
             ON ${REPORTS_DETAIL_TABLE}.reference_snp = interpretations.reference_snp
             AND ${REPORTS_DETAIL_TABLE}.result = interpretations.genotype
             INNER JOIN reference_snp
             ON ${REPORTS_DETAIL_TABLE}.reference_snp = reference_snp.id
             WHERE parent = $1`,
            [id]
        )).rows;
        res.json(reportsDetailed);
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});


router.get(`${ROUTE}/schema`, async (req, res) => {
    try {
        const response = await postgres.query(schemaQuery(REPORTS_DETAIL_TABLE));
        res.json(response.rows);
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.post(ROUTE, async (req, res) => {
    const { user, reportDate, samplingDate, observations, detail } = req.body;
    try {
        const reportResponse = await postgres.query(`
            INSERT INTO ${REPORTS_TABLE}("user", "report_date", "sampling_date", "observations") 
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [user, reportDate, samplingDate, observations]);
        const reportId = reportResponse.rows[0].id;
        const params = Object.keys(detail).reduce((prev, curr) => ([
            ...prev,
            curr,
            detail[curr].genotype
        ]), []);
        const valuesQuery = Object.keys(detail).map((_, index) => `($1, $${index * 2 + 2}, $${index * 2 + 3})`).join(',');
        await postgres.query(`INSERT INTO ${REPORTS_DETAIL_TABLE}(parent, reference_snp, result) VALUES ${valuesQuery}`, [reportId, ...params]);
        res.status(200).send({ message: 'Created' });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.put(ROUTE, async (req, res) => {
    const { reportId, reportDate, samplingDate, observations, detail } = req.body;
    try {
        await postgres.query(`UPDATE ${REPORTS_TABLE} SET report_date = $1, sampling_date = $3, observations = $4 WHERE id = $2`, [reportDate, reportId, samplingDate, observations]);

        await Promise.all(Object.keys(detail).map(async key => {
            const { rows } = await postgres.query(`
                SELECT CAST(COUNT(*) AS INT) as "count"
                FROM ${REPORTS_DETAIL_TABLE} 
                WHERE ${REPORTS_DETAIL_TABLE}.parent = $1 AND ${REPORTS_DETAIL_TABLE}.reference_snp = $2
            `, [reportId, key]);
            if (!rows[0]?.count) {
                await postgres.query(
                    `INSERT INTO ${REPORTS_DETAIL_TABLE}("parent", "reference_snp", "result") VALUES($1, $2, $3)`,
                    [reportId, key, detail[key].genotype]
                );
            } else {
                await postgres.query(
                    `UPDATE ${REPORTS_DETAIL_TABLE} SET result = $2 WHERE "reference_snp" = $1 AND "parent" = $3`,
                    [key, detail[key].genotype, reportId]
                );
            }
        }));
        res.status(200).send({ message: 'Updated' });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

router.delete(ROUTE, async (req, res) => {
    const { body: { id } } = req;
    try {
        await postgres.query(`DELETE FROM ${REPORTS_DETAIL_TABLE} WHERE parent = $1`, [id]);
        await postgres.query(`DELETE FROM ${REPORTS_TABLE} WHERE id = $1`, [id]);
        res.status(200).send({ id, message: 'Deleted' });
    } catch (e) {
        console.log(e);
        res.status(500).send(e);
    }
});

export default router;