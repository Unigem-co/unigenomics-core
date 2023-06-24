import express from 'express';
import reportGenerator from './routes/reportGenerator';
import reports from './routes/report';
import genotypes from './routes/genotypes';
import genotypesByReferenceSnp from './routes/genotypesByReferenceSnp';
import genotypesEffects from './routes/genotypesEffects';
import interpretations from './routes/interpretations';
import referenceSnp from './routes/referenceSnp';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/test', (_, res) => {
    res.send('Online :D');
});
app.use(reportGenerator);
app.use(reports);
app.use(genotypes);
app.use(genotypesByReferenceSnp);
app.use(genotypesEffects);
app.use(interpretations);
app.use(referenceSnp);

app.listen(8080)