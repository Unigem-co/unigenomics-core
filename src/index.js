import express from 'express';
import reportGenerator from './routes/reportGenerator/generateReport';

const app = express();
app.use(express.json());

app.get('/test', (_, res) => {
    res.send('Online :D');
});
app.use(reportGenerator);
app.listen(8080)