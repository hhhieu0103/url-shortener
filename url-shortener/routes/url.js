const express = require('express');
const router = express.Router();
const { pool, execute_txn } = require('../db');
const { nanoid } = require('nanoid');
const client = require('../redis-cache');
const ttl = 24 * 60 * 60;

require('dotenv').config();

class CodePoolExhaustedError extends Error {
    constructor(message = "Exceeds code pool") {
        super(message);
        this.name = "CodePoolExhaustedError";
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (err) {
        return false;
    }
}

const getOriginalURLByShortCode = async (con, shortCode) => {
    const originalRecords = await con.query(`
        SELECT o.url, s.expired_at
        FROM original_url AS o
            LEFT JOIN short_url AS s
                ON o.id = s.original_id
        WHERE s.code = $1 and s.expired_at > now()`, [shortCode])
    if (originalRecords.rowCount > 0) {
        return originalRecords.rows[0];
    }
}

const getNumActiveShortURLByShortCode = async (con, shortCode) => {
    const result = await con.query(`SELECT COUNT(s.id) FROM short_url AS s WHERE s.code = $1 and s.expired_at > now()`, [shortCode]);
    return result.rows[0].count;
}

const createShortURL = async (con, originalURL) => {
    //Check if a new short code can be added to the code pool
    //The code pool size is 64^8
    const allActiveURL = await con.query(`SELECT COUNT(s.id) FROM short_url AS s WHERE s.expired_at > now()`);
    if (allActiveURL.rows[0].count === 64**8) {
        throw new CodePoolExhaustedError();
    }

    //Get the original URL id
    let originalRecords = await con.query(`SELECT o.id FROM original_url AS o WHERE o.url = $1`, [originalURL]);
    if (originalRecords.rowCount === 0) {
        //Insert a new URL into original_url table if url doesn't exist
        originalRecords = await con.query(`INSERT INTO original_url (url) VALUES ($1) RETURNING id`, [originalURL]);
    }
    const originalID = originalRecords.rows[0].id;

    //Generate short code
    let shortCode = nanoid(8);
    let numActiveURL = await getNumActiveShortURLByShortCode(con, shortCode);
    while (numActiveURL > 0) {
        //Regenerate short code if there is an existing active short code
        shortCode = nanoid(8);
        numActiveURL = await getNumActiveShortURLByShortCode(con, shortCode);
    }
    await con.query(`INSERT INTO short_url (original_id, code) VALUES ($1, $2)`, [originalID, shortCode]);
    return shortCode;
}

router.post('/', async function(req, res, next) {
    let originalURL = req.body.url;

    const isValid = isValidUrl(originalURL);
    if (!isValid) {
        res.status(400).send('Invalid URL');
        return;
    }

    try {
        let shortCode = await execute_txn(createShortURL, originalURL);
        const shortURL = process.env.DOMAIN + shortCode;
        await client.set(shortURL, originalURL);
        await client.expire(shortURL, ttl)
        res.send(shortURL);
    }
    catch (error) {
        console.error(error);
        if (error instanceof CodePoolExhaustedError) {
            res.status(507).send('Please try again later.');
            return;
        }
        res.status(500).send(error);
    }
});

router.get('/:shortCode', async function(req, res, next) {
    const shortCode = req.params.shortCode
    const shortURL = process.env.DOMAIN + shortCode;

    let url = await client.get(shortURL);

    if (!url) {
        const result = await getOriginalURLByShortCode(pool, shortCode)
        if (!result) {
            res.status(404).send('Not found');
            return;
        } else {
            url = result.url;
            await client.set(shortURL, url);
            await client.expireAt(shortURL, result.expired_at);
        }
    }

    // res.redirect(url)
    res.send(url)
})

module.exports = router;
