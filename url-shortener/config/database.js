require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();
const executeTransaction = async (callbackFn, ...parameters) => {
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        const result = await callbackFn(client, ...parameters);
        await client.query('COMMIT')
        return result;
    } catch (err) {
        throw err;
    } finally {
        client.release();
    }
}
module.exports = {pool, executeTransaction};