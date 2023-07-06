import express, { Router } from 'express';
import reportGenerator from './routes/reportGenerator';
import reports from './routes/report';
import genotypes from './routes/genotypes';
import genotypesByReferenceSnp from './routes/genotypesByReferenceSnp';
import genotypesEffects from './routes/genotypesEffects';
import interpretations from './routes/interpretations';
import referenceSnp from './routes/referenceSnp';
import { login, users } from './routes/users';

import dotenv from 'dotenv';
import authorizationMiddleware from './routes/authorizationMiddleware';

dotenv.config();

const app = express();
app.use(express.json());

const testRouter = Router();
testRouter.get('/test', (_, res) => {
    res.send('Online :D');
});

app.use(authorizationMiddleware);
app.use('/api', reportGenerator);
app.use('/api', testRouter);
app.use('/api', reports);
app.use('/api', genotypes);
app.use('/api', genotypesByReferenceSnp);
app.use('/api', genotypesEffects);
app.use('/api', interpretations);
app.use('/api', referenceSnp);
app.use('/api', login);
app.use('/api', users);

app.listen(8080)