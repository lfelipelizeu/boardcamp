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
    } catch {
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
    } catch {
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
    } catch {
        res.sendStatus(500);
    }
});

app.post('/games', async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

    const userSchema = joi.object({
        name: joi.string().empty().trim().required(),
        stockTotal: joi.number().integer().positive().required(),
        pricePerDay: joi.number().integer().positive().required(),
        categoryId: joi.number().integer().positive().required(),
    });

    try {
        const { error } = userSchema.validate({
            name,
            stockTotal,
            categoryId,
            pricePerDay,
        });

        const categories = await connection.query('SELECT * FROM categories WHERE id = $1;', [categoryId]);
        if (joi.isError(error) || categories.rows.length === 0) {
            res.sendStatus(400);
            return;
        }

        const games = await connection.query('SELECT * FROM games WHERE name = $1', [name.trim()]);
        if (games.rows.length !== 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1,$2,$3,$4,$5);`, [name.trim(), image, stockTotal, categoryId, pricePerDay]);

        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.get('/customers', async (req, res) => {
    const cpfFilter = req.query.name;

    try {
        if (cpfFilter !== undefined) {
            const customers = await connection.query(`
                SELECT 
                    * 
                FROM customers 
                    WHERE cpf LIKE $1;`, [cpfFilter + '%']);

            res.status(200).send(customers.rows);
            return;
        }

        const customers = await connection.query(`SELECT * FROM customers;`);

        res.status(200).send(customers.rows);
    } catch {
        res.sendStatus(500);
    }
});

app.listen(4000);