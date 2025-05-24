const { nanoid } = require('nanoid');
const getClient = require('../config/cache');
const { pool, executeTransaction } = require('../config/database');

class UrlService {
    cache;

    constructor() {
        getClient().then((client) => {
            this.cache = client;
        })
    }

    async getNumActive(shortCode) {
        const result = await pool.query(`
            SELECT COUNT(s.id)
            FROM short_url AS s
            WHERE s.code = $1 and
                  s.expired_at > now()
        `, [shortCode]);
        return result.rows[0].count;
    }

    async createShortURL(originalURL) {
        //Check if a new short code can be added to the code pool
        //The code pool size is 64^8
        const allActiveURL = await pool.query(`
            SELECT COUNT(s.id)
            FROM short_url AS s
            WHERE s.expired_at > now()`);
        if (allActiveURL.rows[0].count === 64**8) return -1

        //Get the original URL id
        let originalRecords = await pool.query(`
            SELECT o.id
            FROM original_url AS o
            WHERE o.url = $1
        `, [originalURL]);

        //Generate short code
        let shortCode = nanoid(8);
        let numActiveURL = await this.getNumActive(shortCode);
        while (numActiveURL > 0) {
            //Regenerate short code if there is an existing active short code
            shortCode = nanoid(8);
            numActiveURL = await this.getNumActive(shortCode);
        }

        await executeTransaction(async (con) => {
            //Insert a new URL into original_url table if url doesn't exist
            if (originalRecords.rowCount === 0) {
                originalRecords = await con.query(`INSERT INTO original_url (url) VALUES ($1) RETURNING id`, [originalURL]);
            }
            const originalID = originalRecords.rows[0].id;

            await con.query(`
                INSERT INTO short_url (original_id, code)
                VALUES ($1, $2)
            `, [originalID, shortCode]);
        });

        await cache.set(shortCode, originalURL);
        await cache.expire(shortCode, parseInt(process.env.CACHETTL));

        return shortCode;
    }

    async getOriginalURL(shortCode) {
        //Get URL from Redis cache
        const url = await cache.get(shortCode);
        if (url) return url;

        //Get URL from database if it doesn't exist in cache
        const originalRecords = await pool.query(`
                SELECT o.url, s.expired_at
                FROM original_url AS o
                    LEFT JOIN short_url AS s
                        ON o.id = s.original_id
                WHERE s.code = $1 and s.expired_at > now()
            `, [shortCode])

        if (originalRecords.rowCount > 0) {
            const result = originalRecords.rows[0]
            await cache.set(shortCode, result.url);
            await cache.expireAt(shortCode, result.expired_at);
            return result.url;
        }
    }
}

module.exports = { UrlService };