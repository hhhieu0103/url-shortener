require('dotenv').config();
const { createClient } = require('redis')
const client = createClient({
    username: process.env.RUSER,
    password: process.env.RPASSWORD,
    socket: {
        host: process.env.RHOST,
        port: process.env.RPORT,
    }
});

client.on('error', err => console.log('Redis Client Error', err));

let connected = false;

const getClient = async () => {
    if (!connected) {
        connected = true;
        await client.connect();
    } else return client;
}

module.exports = getClient;