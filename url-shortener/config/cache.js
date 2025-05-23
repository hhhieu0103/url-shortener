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

client.connect().then(() => {console.log('Redis Connected')});

module.exports = client;