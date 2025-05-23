const express = require('express');
const router = express.Router();
const { UrlService } = require('../services/urlService');
const urlService = new UrlService()

require('dotenv').config();

router.post('/', function(req, res, next) {
    const url = req.body.url;
    if (!url) return res.status(400).send("URL is required");

    try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).send("URL is required");
        }
    } catch (error) {
        return res.status(400).send("'Please provide a valid URL'");
    }

    if (url.length > 2048) {
        return res.status(400).send("URL must be less than 2048 characters");
    }

    next()

}, async function(req, res, next) {
    let originalURL = req.body.url;

    try {
        let shortCode = await urlService.createShortURL(originalURL);
        const shortURL = process.env.DOMAIN + shortCode;
        if (shortURL === -1) return res.status(400).send("Please try again later");
        res.send(shortURL);
    }
    catch (error) {
        next(error);
    }
});

router.get('/:shortCode', async function(req, res, next) {

    const shortCode = req.params.shortCode
    if (!shortCode) return res.status(400).send("Short code is required");

    if (shortCode.length !== 8) {
        return res.status(400).send("Short code must have 8 characters");
    }

    if (!/^[A-Za-z0-9_-]+$/.test(shortCode)) {
        return res.status(400).send("Short code contains invalid characters");
    }

    next()

}, async function(req, res) {
    const shortCode = req.params.shortCode
    const url = await urlService.getOriginalURL(shortCode)
    if (!url) res.status(404).send('Not found');
    // res.redirect(url)
    res.send(url)
})

module.exports = router;
