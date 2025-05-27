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

// CORS middleware
app.use((req, res, next) => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});