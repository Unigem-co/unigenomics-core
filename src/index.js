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

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://localhost:80',
        'http://127.0.0.1:80',
        'http://localhost',
        'http://127.0.0.1'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Use CORS middleware with configuration
app.use(cors(corsOptions));

// Handle OPTIONS requests globally
app.options('*', cors(corsOptions));

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