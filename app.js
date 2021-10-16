import express from 'express';
import cors from 'cors';
import connection from './database.js';

const app = express();
app.use(express.json());
app.use(cors());

app.get('/categories', async (req, res) => {
    try {
        const categories = await connection.query('SELECT * FROM categories;');

        res.status(200).send(categories.rows);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.listen(4000);