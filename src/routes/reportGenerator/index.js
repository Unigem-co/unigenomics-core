import { Router } from 'express';
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from 'docxtemplater-image-module-free';
import libre from 'libreoffice-convert';
import fs from "fs";
import path from "path";
import { promisify } from 'util';
import { PostgressRepository } from '../../postgresql/postgrees';
import { readableDate } from '../../utils';

const postgres = new PostgressRepository();
const lib_convert = promisify(libre.convert)

const RESULT_QUERY = `
    SELECT RIGHT('0000000000' || users.prime_id::text, 10) AS id, users.name, users.name || ' ' || users.last_names as "fullName", 
            users.document_type as "idNumberType", users.document, users.birdth_date as "birthDate",
            reports.report_date as "reportDate", reports.sampling_date as "samplingDate", 
            reference_snp.rs_name as "rs", reference_snp.references as "references",
            genotypes.genotype_name as "result",
            interpretations.interpretation as "interpretation",
            genotype_effects.name as "genotypeEffect",
            CASE WHEN observations = NULL THEN FALSE ELSE TRUE END as hasObservations,
            reports.observations
    FROM reports
    INNER JOIN reports_detailed
    ON reports.id = reports_detailed.parent
    INNER JOIN users
    ON users.id = reports.user
    INNER JOIN reference_snp
    ON reference_snp.id = reports_detailed.reference_snp
    INNER JOIN interpretations
    ON interpretations.genotype = reports_detailed.result
    AND interpretations.reference_snp = reference_snp.id
	INNER JOIN genotype_effects
    ON genotype_effects.id = interpretations.genotype_effect
    INNER JOIN genotypes
    ON reports_detailed.result = genotypes.id
    WHERE reports.id = $1
`

const router = Router();
const configureImageModule = () => {
    //Below the options that will be passed to ImageModule instance
    const opts = {
        centered: false, //Set to true to always center images
        fileType: "docx", //Or pptx
        getImage: (tagValue, tagName) => {
            const imagePath = path.resolve(__dirname, tagValue);
            return fs.readFileSync(imagePath);
        },
        getSize: function (img, tagValue, tagName) {
            if (tagName === 'image') {
                return [45, 105];
            }
            return [55, 125];
        }
    };

    return new ImageModule(opts);
};

const getReportData = async reportId => {
    try {
        const reportResult = (await postgres.query(RESULT_QUERY, [reportId])).rows;
        const user = {
            id: reportResult[0].id,
            document: reportResult[0].document,
            name: reportResult[0].name,
            idNumberType: reportResult[0].idNumberType,
            samplingDate: readableDate(reportResult[0].samplingDate),
            birthDate: readableDate(reportResult[0].birthDate),
            fullName: reportResult[0].fullName,
            reportDate: readableDate(reportResult[0].reportDate),
            observations: reportResult[0].observations,
        };
        const results = reportResult.reduce((prev, curr) => ({
            ...prev,
            [curr.rs]: {
                result: curr.result,
                interpretation: curr.interpretation,
                references: curr.references,
                genotypeEffect: curr.genotypeEffect,
            }
        }), {});

        return { user, ...results };
    } catch(error) {
        throw error;
    }
}

const generatePDF = async (document, userId) => {
    const docxResultPath = path.resolve(__dirname, `result-${userId}-${Date.now()}.docx`);
    const pdfResultPath = path.resolve(__dirname, `result-${userId}-${Date.now()}.pdf`);
    const buf = document.getZip().generate({
        type: "nodebuffer",
    });
    fs.writeFileSync(docxResultPath, buf);
    const done = await lib_convert(buf, '.pdf', undefined);
    fs.writeFileSync(pdfResultPath, done);
    
    return [docxResultPath, pdfResultPath]
};

const generateReplacements = (data) => {
    const images = {
        atenuado: '../../../public/images/atenuado.png',
        intermedio: '../../../public/images/intermedio.png',
        optimo: '../../../public/images/optimo.png',
    };
    return Object.keys(data).reduce((prev, curr) => {
        const image = curr === 'user'
            ? undefined
            : { image: `../../../public/images/${data[curr].genotypeEffect}.png` };
        return {
            ...prev,
            [curr]: {
                ...data[curr],
                ...image,
            }
        };
    }, { images });
};

router.post('/generate-report/:id', async (req, res) => {
    const {params: { id }} = req;
    const data = await getReportData(id);
    try {
        // Load the docx file as binary content
        const content = fs.readFileSync(
            path.resolve(__dirname, '../../../public/template.docx'),
            "binary"
        );
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            modules: [configureImageModule()]
        });

        // Replace data in template
        const replacements = generateReplacements(data);
        debugger;
        doc.render(replacements);

        // Generate PDF and return it
        const userId = data.user.document;
        const [docxResultPath, pdfResultPath] = await generatePDF(doc, userId);
        const file = fs.createReadStream(pdfResultPath);
        const stat = fs.statSync(pdfResultPath);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${userId}.pdf`);
        file.pipe(res);
        file.on('end', () => {
            fs.unlinkSync(docxResultPath);
            fs.unlinkSync(pdfResultPath);
        });
    } catch(error) {
        res.status(500).send('Unable to generate report');
    }
});

export default router;
