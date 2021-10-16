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

app.get('/games', async (req, res) => {
    const searchFilter = req.query.name;

    try {
        if (searchFilter !== undefined) {
            const games = await connection.query(`
                SELECT 
                    games.*, 
                    categories.name AS "categoryName" 
                FROM games 
                    JOIN categories 
                        ON games."categoryId" = categories.id 
                    WHERE LOWER (games.name) LIKE LOWER ($1);`, [searchFilter + '%']);

            res.status(200).send(games.rows);
            return;
        }

        const games = await connection.query(`
            SELECT 
                games.*, 
                categories.name AS "categoryName" 
            FROM games 
                JOIN categories 
                    ON games."categoryId" = categories.id;`);

        res.status(200).send(games.rows);
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

app.listen(4000);