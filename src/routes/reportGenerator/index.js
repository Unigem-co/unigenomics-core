import { Router } from 'express';
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from 'docxtemplater-image-module-free';
import libre from 'libreoffice-convert';
import fs from "fs";
import path from "path";
import { promisify } from 'util';

const lib_convert = promisify(libre.convert)

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

router.post('/generate-report', async (req, res) => {
    const data = req.body;
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
