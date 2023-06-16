import { Router } from 'express';
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from 'docxtemplater-image-module-free';
import fs from "fs";
import path from "path";


const options = {format: 'letter'};
const router = Router();

router.post('/generate-report', async (req, res) => {
    try {
        // Load the docx file as binary content
        const content = fs.readFileSync(
            path.resolve(__dirname, '../public/template.docx'),
            "binary"
        );

        const zip = new PizZip(content);
        //Below the options that will be passed to ImageModule instance
        var opts = {};
        opts.centered = false; //Set to true to always center images
        opts.fileType = "docx"; //Or pptx

        //Pass your image loader
        opts.getImage = function (tagValue, tagName) {
            const imagePath = path.resolve(__dirname, tagValue);
            return fs.readFileSync(imagePath);
        };

        //Pass the function that return image size
        opts.getSize = function (img, tagValue, tagName) {
            if (tagName==='image') {
                return [45, 105];
            }
            return [55, 125];
        };

        var imageModule = new ImageModule(opts);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            modules: [imageModule]
        });

        const data = req.body;
        data.images = {
            atenuado: '../public/images/atenuado.png',
            intermedio: '../public/images/intermedio.png',
            optimo: '../public/images/optimo.png',
        };
        const replacements = Object.keys(data).reduce((prev, curr) => {
            const image = curr === 'user' || curr === 'images' ? undefined : {image: `../public/images/${data.genotypeEffect || 'atenuado'}.png`};
            return {
                ...prev,
                [curr]: {
                    ...data[curr],
                    ...image,
                }
            }
        }, {});
        console.log(replacements);
        doc.render(replacements);

        const buf = doc.getZip().generate({
            type: "nodebuffer",
            // compression: DEFLATE adds a compression step.
            // For a 50MB output document, expect 500ms additional CPU time
            compression: "DEFLATE",
        });

        // buf is a nodejs Buffer, you can either write it to a
        // file or res.send it with express for example.
        fs.writeFileSync(path.resolve(__dirname, "output.docx"), buf);

        res.send('ok');
    } catch(error) {
        console.log(error);
        res.status(500).json(error);
    }
    
});


export default router;