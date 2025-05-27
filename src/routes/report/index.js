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

const referencesWithGenotypesQuery = `
    SELECT 
        reference_snp.id,
        reference_snp.rs_name,
        json_agg(
            json_build_object(
                'genotype_id', genotypes.id,
                'genotype_name', genotypes.genotype_name,
                'interpretation', interpretations.interpretation
            )
        ) as genotypes
    FROM reference_snp
    LEFT JOIN interpretations ON reference_snp.id = interpretations.reference_snp
    LEFT JOIN genotypes ON interpretations.genotype = genotypes.id
    GROUP BY reference_snp.id, reference_snp.rs_name
    ORDER BY reference_snp.rs_name
`;

router.get(ROUTE, async (req, res) => {
    try {
        const referencesWithGenotypes = (await postgres.query(referencesWithGenotypesQuery)).rows;
        
        // Filter out null values from genotypes array and ensure proper structure
        const formattedResponse = referencesWithGenotypes.map(ref => ({
            ...ref,
            genotypes: ref.genotypes
                .filter(g => g.genotype_id !== null)
                .map(g => ({
                    genotype_id: g.genotype_id,
                    genotype_name: g.genotype_name
                }))
        }));

        res.json(formattedResponse);
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
            `SELECT 
                ${REPORTS_DETAIL_TABLE}.id,
                ${REPORTS_DETAIL_TABLE}.parent,
                ${REPORTS_DETAIL_TABLE}.reference_snp,
                ${REPORTS_DETAIL_TABLE}.result,
                interpretations.interpretation,
                reference_snp.rs_name,
                genotypes.genotype_name
             FROM ${REPORTS_DETAIL_TABLE} 
             INNER JOIN interpretations 
                ON ${REPORTS_DETAIL_TABLE}.reference_snp = interpretations.reference_snp
                AND ${REPORTS_DETAIL_TABLE}.result = interpretations.genotype
             INNER JOIN reference_snp
                ON ${REPORTS_DETAIL_TABLE}.reference_snp = reference_snp.id
             INNER JOIN genotypes
                ON ${REPORTS_DETAIL_TABLE}.result = genotypes.id
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
        // Validate required fields
        if (!user) {
            return res.status(400).json({ message: 'Usuario es requerido' });
        }
        if (!reportDate) {
            return res.status(400).json({ message: 'Fecha de reporte es requerida' });
        }
        if (!samplingDate) {
            return res.status(400).json({ message: 'Fecha de toma de muestra es requerida' });
        }
        if (!detail || Object.keys(detail).length === 0) {
            return res.status(400).json({ message: 'Debe incluir al menos un resultado' });
        }

        // Start transaction
        await postgres.query('BEGIN');

        try {
            const reportResponse = await postgres.query(`
                INSERT INTO ${REPORTS_TABLE}("user", "report_date", "sampling_date", "observations") 
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [user, reportDate, samplingDate, observations]);
            
            const reportId = reportResponse.rows[0].id;
            
            // Only process details that have a genotype value
            const validDetails = Object.entries(detail)
                .filter(([_, value]) => value && value.genotype)
                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

            if (Object.keys(validDetails).length > 0) {
                const params = Object.keys(validDetails).reduce((prev, curr) => ([
                    ...prev,
                    curr,
                    validDetails[curr].genotype
                ]), []);
                
                const valuesQuery = Object.keys(validDetails)
                    .map((_, index) => `($1, $${index * 2 + 2}, $${index * 2 + 3})`)
                    .join(',');
                
                await postgres.query(
                    `INSERT INTO ${REPORTS_DETAIL_TABLE}(parent, reference_snp, result) VALUES ${valuesQuery}`,
                    [reportId, ...params]
                );
            }

            // Commit transaction
            await postgres.query('COMMIT');
            res.status(200).json({ message: 'Created', id: reportId });
        } catch (error) {
            // Rollback on error
            await postgres.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ 
            message: 'Error al crear el reporte',
            error: error.message 
        });
    }
});

router.put(ROUTE, async (req, res) => {
    const { reportId, reportDate, samplingDate, observations, detail } = req.body;
    
    try {
        // Validate required fields
        if (!reportId) {
            return res.status(400).json({ message: 'ID del reporte es requerido' });
        }
        if (!reportDate) {
            return res.status(400).json({ message: 'Fecha de reporte es requerida' });
        }
        if (!samplingDate) {
            return res.status(400).json({ message: 'Fecha de toma de muestra es requerida' });
        }

        // Start transaction
        await postgres.query('BEGIN');

        try {
            // Update report main data
            await postgres.query(
                `UPDATE ${REPORTS_TABLE} SET report_date = $1, sampling_date = $2, observations = $3 WHERE id = $4`,
                [reportDate, samplingDate, observations, reportId]
            );

            // Update or insert details
            if (detail && Object.keys(detail).length > 0) {
                for (const [key, value] of Object.entries(detail)) {
                    if (!value || !value.genotype) continue;

                    const { rows } = await postgres.query(`
                        SELECT CAST(COUNT(*) AS INT) as "count"
                        FROM ${REPORTS_DETAIL_TABLE} 
                        WHERE parent = $1 AND reference_snp = $2
                    `, [reportId, key]);

                    if (!rows[0]?.count) {
                        await postgres.query(
                            `INSERT INTO ${REPORTS_DETAIL_TABLE}(parent, reference_snp, result) VALUES($1, $2, $3)`,
                            [reportId, key, value.genotype]
                        );
                    } else {
                        await postgres.query(
                            `UPDATE ${REPORTS_DETAIL_TABLE} SET result = $1 WHERE reference_snp = $2 AND parent = $3`,
                            [value.genotype, key, reportId]
                        );
                    }
                }
            }

            // Commit transaction
            await postgres.query('COMMIT');
            res.status(200).json({ message: 'Updated' });
        } catch (error) {
            // Rollback on error
            await postgres.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ 
            message: 'Error al actualizar el reporte',
            error: error.message 
        });
    }
});

router.delete(`${ROUTE}/:id`, async (req, res) => {
    const { id } = req.params;
    
    try {
        if (!id) {
            return res.status(400).json({ message: 'ID del reporte es requerido' });
        }

        // Start transaction
        await postgres.query('BEGIN');

        try {
            // Delete report details first (due to foreign key constraint)
            await postgres.query(`DELETE FROM ${REPORTS_DETAIL_TABLE} WHERE parent = $1`, [id]);
            
            // Delete the report
            const result = await postgres.query(
                `DELETE FROM ${REPORTS_TABLE} WHERE id = $1 RETURNING id`, 
                [id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ message: 'Reporte no encontrado' });
            }

            // Commit transaction
            await postgres.query('COMMIT');
            res.status(200).json({ id, message: 'Deleted' });
        } catch (error) {
            // Rollback on error
            await postgres.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ 
            message: 'Error al eliminar el reporte',
            error: error.message 
        });
    }
});

export default router;