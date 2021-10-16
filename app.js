import express from 'express';
import cors from 'cors';
import joi from 'joi';
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

app.post('/categories', async (req, res) => {
    const newCategoryName = req.body.name.trim();

    const userSchema = joi.object({
        name: joi.string().empty()
    });

    try {
        const { error } = userSchema.validate({
            name: newCategoryName,
        });

        if (joi.isError(error)) {
            res.sendStatus(400);
            return;
        }
        
        const categories = await connection.query('SELECT * FROM categories;');
        if (categories.rows.some(category => category.name === newCategoryName)) {
            res.sendStatus(409);
            return;
        }

        await connection.query('INSERT INTO categories (name) VALUES ($1)', [newCategoryName]);

        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.listen(4000);