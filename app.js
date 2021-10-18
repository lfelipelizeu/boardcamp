import express from 'express';
import cors from 'cors';
import joi from 'joi';
import connection from './database.js';
import dayjs from 'dayjs';

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
    const cpfFilter = req.query.cpf;

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

app.get('/customers/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const customer = await connection.query(`SELECT * FROM customers WHERE id = $1;`, [id]);

        if (customer.rows.length > 0) {
            res.status(200).send(customer.rows[0]);
        } else {
            res.sendStatus(404);
        }
    } catch {
        res.sendStatus(500);
    }
});

app.post('/customers', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;

    const userSchema = joi.object({
        name: joi.string().empty().trim().required(),
        phone: joi.string().min(10).max(11).required(),
        cpf: joi.string().length(11).required(),
        birthday: joi.date().less('now').required(),
    });

    try {
        const { error } = userSchema.validate({
            name,
            phone,
            cpf,
            birthday,
        });

        if (joi.isError(error) || isNaN(Number(cpf)) || isNaN(Number(phone))) {
            res.sendStatus(400);
            return;
        }

        const customers = await connection.query('SELECT * FROM customers WHERE cpf = $1;', [cpf]);
        if (customers.rows.length !== 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query(`INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1,$2,$3,$4);`, [name.trim(), phone, cpf, birthday]);

        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.put('/customers/:id', async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    const { id } = req.params;

    const userSchema = joi.object({
        name: joi.string().empty().trim().required(),
        phone: joi.string().min(10).max(11).required(),
        cpf: joi.string().length(11).required(),
        birthday: joi.date().less('now').required(),
    });

    try {
        const { error } = userSchema.validate({
            name,
            phone,
            cpf,
            birthday,
        });

        const customer = await connection.query(`SELECT * FROM customers WHERE id = $1;`, [id]);
        if (customer.rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        if (joi.isError(error) || isNaN(Number(cpf)) || isNaN(Number(phone))) {
            res.sendStatus(400);
            return;
        }

        const customers = await connection.query('SELECT * FROM customers WHERE cpf = $1;', [cpf]);
        if (customer.rows[0].cpf !== cpf && customers.rows.length !== 0) {
            res.sendStatus(409);
            return;
        }

        await connection.query(`UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5;`, [name.trim(), phone, cpf, birthday, id]);

        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
});

app.get('/rentals', async (req, res) => {
    const { customerId, gameId } = req.query;

    let rentals = [];

    try {
        if (customerId !== undefined) {
            rentals = await connection.query(`
                SELECT 
                    rentals.*, 
                    customers.name AS "customerName", 
                    games.name AS "gameName", 
                    games."categoryId", 
                    categories.name AS "categoryName" 
                FROM rentals 
                    JOIN customers 
                        ON rentals."customerId" = customers.id 
                    JOIN games 
                        ON rentals."gameId" = games.id 
                    JOIN categories ON games."categoryId" = categories.id
                WHERE customers.id = $1;`, [customerId]);
        } else if (gameId !== undefined) {
            rentals = await connection.query(`
                SELECT 
                    rentals.*, 
                    customers.name AS "customerName", 
                    games.name AS "gameName", 
                    games."categoryId", 
                    categories.name AS "categoryName" 
                FROM rentals 
                    JOIN customers 
                        ON rentals."customerId" = customers.id 
                    JOIN games 
                        ON rentals."gameId" = games.id 
                    JOIN categories ON games."categoryId" = categories.id
                WHERE games.id = $1;`, [gameId]);
        } else {
            rentals = await connection.query(`
                SELECT 
                    rentals.*, 
                    customers.name AS "customerName", 
                    games.name AS "gameName", 
                    games."categoryId", 
                    categories.name AS "categoryName" 
                FROM rentals 
                    JOIN customers 
                        ON rentals."customerId" = customers.id 
                    JOIN games 
                        ON rentals."gameId" = games.id 
                    JOIN categories ON games."categoryId" = categories.id;`);
        }

        res.status(200).send(rentals.rows.map((rental) => {
            return {
                id: rental.id,
                customerId: rental.customerId,
                gameId: rental.gameId,
                rentDate: rental.rentDate,
                daysRented: rental.daysRented,
                returnDate: rental.returnDate,
                originalPrice: rental.originalPrice,
                delayFee: rental.delayFee,
                customer: {
                    id: rental.customerId,
                    name: rental.customerName,
                },
                game: {
                    id: rental.gameId,
                    name: rental.gameName,
                    categoryId: rental.categoryId,
                    categoryName: rental.categoryName,
                },
            }
        }));
    } catch {
        res.sendStatus(500);
    }
});

app.post('/rentals', async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;

    try {
        const customer = await connection.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
        const gameRentals = await connection.query(`SELECT * FROM rentals WHERE "gameId" = $1`, [gameId]);
        const game = await connection.query(`SELECT * FROM games WHERE id = $1`, [gameId]);
        if (customer.rows.length === 0 || game.rows.length === 0 || game.rows[0].stockTotal === gameRentals.rows.length || daysRented < 1) {
            res.sendStatus(400);
            return;
        }

        await connection.query(`
            INSERT INTO rentals 
                ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
            VALUES ($1, $2, $3, $4, $5, $6, $7)`, [customerId, gameId, dayjs().format('YYYY-MM-DD'), daysRented, null, daysRented*game.rows[0].pricePerDay, null]);

        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.post('/rentals/:id/return', async (req, res) => {
    const { id } = req.params;

    try {
        const rental = await connection.query(`SELECT * FROM rentals WHERE id = $1`, [id]);

        if (rental.rows.length === 0) {
            res.sendStatus(404);
            return;
        }
        if (rental.rows[0].returnDate !== null) {
            res.sendStatus(400);
            return;
        }

        const correctReturnDate = dayjs(rental.rows[0].rentDate).add(rental.rows[0].daysRented, 'day');
        const returnDate = dayjs();
        const pricePerDay = rental.rows[0].originalPrice / rental.rows[0].daysRented;
        const delayFee = returnDate.isSame(correctReturnDate) || returnDate.isBefore(correctReturnDate) ? 0 : returnDate.diff(correctReturnDate, 'day')*pricePerDay;

        await connection.query(`UPDATE rentals SET "returnDate" = $1, "delayFee" = $2 WHERE id = $3`, [returnDate.format('YYYY-MM-DD'), delayFee, id]);
        
        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
});

app.delete('/rentals/:id', async function (req, res) {
    const { id } = req.params;

    try {
        const rental = await connection.query(`SELECT * FROM rentals WHERE id = $1`, [id]);

        if (rental.rows.length === 0) {
            res.sendStatus(404);
            return;
        }
        if (rental.rows[0].returnDate !== null) {
            res.sendStatus(400);
            return;
        }

        await connection.query(`DELETE FROM rentals WHERE id = $1`, [id]);

        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
});

app.listen(4000);