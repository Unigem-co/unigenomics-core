import express, { Router } from 'express';
import reportGenerator from './routes/reportGenerator';
import reports from './routes/report';
import genotypes from './routes/genotypes';
import genotypesByReferenceSnp from './routes/genotypesByReferenceSnp';
import genotypesEffects from './routes/genotypesEffects';
import interpretations from './routes/interpretations';
import referenceSnp from './routes/referenceSnp';
import { login, users } from './routes/users';
import cors from 'cors';

import dotenv from 'dotenv';
import authorizationMiddleware from './routes/authorizationMiddleware';

dotenv.config();

const app = express();
app.use(express.json());

// CORS middleware - Allow all hosts
app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
        [process.env.ALLOWED_ORIGINS.split(','), 'http://127.0.0.1:80'] : 
        ['http://0.0.0.0:3000'];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

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

// Public routes that don't need authorization
app.use('/api', testRouter);
app.use('/api', login);

// Protected routes
app.use(authorizationMiddleware);
app.use('/api', reportGenerator);
app.use('/api', reports);
app.use('/api', genotypes);
app.use('/api', genotypesByReferenceSnp);
app.use('/api', genotypesEffects);
app.use('/api', interpretations);
app.use('/api', referenceSnp);
app.use('/api', users);

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0');