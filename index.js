const express = require('express');
const request = require('request');
const https = require('https');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const selfsigned = require('selfsigned');
const serverless = require("serverless-http");
const app = express();

require('dotenv').config()

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Design file
app.use(express.static("public"));
app.set("view engine", "ejs");

//Generate certificate
const pems = selfsigned.generate(null, { days: 365 });
const options = {
    key: pems.private,
    cert: pems.cert,
};

const APP_NAME = process.env.APP_NAME || 'Collageify';
const BASE_URL = process.env.BASE_URL || "https://127.0.0.1:8080";
const REDIRECT_URI = `${BASE_URL}/callback`;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;

app.get("/", (req, res) => {
    res.render('index.ejs', { APP_NAME });
});

app.get('/login', (req, res) => {
    let scope = 'user-read-private user-read-email user-top-read';
    let state = generateRandomString(16);

    // Set the state as cookie
    res.cookie('spotify-state', state);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
})

app.get('/callback', (req, res) => {
    let code = req.query.code || null;
    let state = req.query.state || null;

    if (req.cookies['spotify-state'] !== state) {
        return res.status(403).send('Potential CSRF detected');
    }

    // Clear state after successful callback to avoid fixation attacks
    res.clearCookie('spotify-state');

    // Only fetch client secret here
    let client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        },
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (new Buffer.from(SPOTIFY_CLIENT_ID + ':' + client_secret).toString('base64'))
        },
        json: true
    };

    request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {

            // Set tokens as cookie
            res.cookie('ci_access_token', body.access_token, { maxAge: 30 * 60 * 1000, httpOnly: true, secure: true });  // maxAge: 5 minutes

            res.redirect(`/create`);
        } else {
            res.send('There was an error during authentication.');
        }
    });
});

app.get("/create", async (req, res) => {

    // If access token is not present, redirect to login
    if (!req.cookies['ci_access_token']) {
        return res.redirect('/');
    }

    let access_token = req.cookies['ci_access_token'];
    
    var options = {
        url: `https://api.spotify.com/v1/me`,
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };
    
    request.get(options, async function (error, response, body) {
        if (!error && response.statusCode === 200) {
            const DISPLAY_NAME = getUserFirstName(body.display_name);
            res.render("create_collage.ejs", { APP_NAME, DISPLAY_NAME });
        } else {
            res.status(400).json({
                error: {
                    message: 'There was an error fetching top tracks.',
                }
            });
        }
    });
});

app.get("/logout", async (req, res) => {
    // #NOTE: DO NOT LOGOUT USER FROM SPOTIFY

    // Clear app cookie
    res.clearCookie('ci_access_token');

    res.redirect("/");
})

// APIs
app.get("/api/getTopTracks", async (req, res) => {
    // // If access token is not present, redirect to login
    if (!req.cookies['ci_access_token']) {
        return res.json({
            error: "Token not found"
        }, 400);
    }

    let timeRange = req.query.time_range || "short_term";
    let offset = req.query.offset || 0;
    let limit = req.query.limit || 20;

    let access_token = req.cookies['ci_access_token'];

    var options = {
        url: `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&offset=${offset}&limit=${limit}`,
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    request.get(options, async function (error, response, body) {
        if (!error && response.statusCode === 200) {
            res.json(body);
        } else {
            res.status(400).json({
                error: {
                    message: 'There was an error fetching top tracks.',
                }
            });
        }
    });
});

// Helper functions
function generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function getUserFirstName(name) {
    if (!name) return "";

    const firstName = name.split(" ")[0];
    return firstName;
}

// Start the server
const PORT = process.env.PORT || 8080;
const HOST = '127.0.0.1';
https.createServer(options, app).listen(PORT, HOST, () => {
    console.log(`App listening on: https://${HOST}:${PORT}/`);
    console.log('Press Ctrl+C to quit.');
});

module.exports.handler = serverless(app);