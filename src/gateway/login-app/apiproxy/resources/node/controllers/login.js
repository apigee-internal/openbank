/**
 * Created by rmahalank on 8/8/17.
 */
var request = require('request');
var login = {};
var jwt = require('jsonwebtoken');
var config = require('./../config.json');

const HTTP_URL_PATTERN = /^(http|https):\/\/.+/;


login.loginForm = function (req, res, next) {
    var redirectUri = req.query.redirectUri;
    var state = req.query.state;
    var session = req.signedCookies[config.authCookieName];


    if (!redirectUri || !HTTP_URL_PATTERN.test(redirectUri)) {
        console.log("Error Redirect Uri");
        var err = {
            message: 'Invalid Data',
            error: {
                status: 'Invalid Redirect Uri',
                stack: redirectUri
            }
        }
        res.render(error, err);
    } else if (!state) {
        console.log("Invalid State value");
        var err = config.errors.invalid_state;
        res.redirect(redirectUri + "?state=" + state + "&error=" + err.code + "&description=" + err.description);

    }

    else {
        if (session && session.authenticationTransaction) {
            var userDetails = jwt.sign(session.authenticationTransaction, config.jwtSignKey || 'ssshhhh', {expiresIn: 5 * 60});
            res.redirect(redirectUri + "?state=" + state + "&userDetails=" + userDetails);
        }
        else {

            var viewObject = {
                redirectUri: redirectUri,
                state: state
            };

            res.render('login', viewObject);
        }
    }
};

login.doLogin = function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var redirectUri = req.body.redirectUri;
    var state = req.body.state;
    // call the authentication endpoint to validate the user credentials

    if (!redirectUri || !HTTP_URL_PATTERN.test(redirectUri)) {
        console.log("Error Redirect Uri");
        var err = {
            message: 'Invalid Data',
            error: {
                status: 'Invalid Redirect Uri',
                stack: redirectUri
            }
        }
        res.render(error, err);
    } else if (!state) {
        console.log("Invalid State value");
        var err = config.errors.invalid_state;
        res.redirect(redirectUri + "?state=" + state + "&error=" + err.code + "&description=" + err.description);

    } else {
        var options = {
            'url': config.authenticationTransaction.transactionEndpoint,
            'method': config.authenticationTransaction.method,
            'headers': config.authenticationTransaction.headers,
            'body': {
                "grant_type": "password",
                "username": username,
                "password": password
            },
            "json": true
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200 && redirectUri && state) {
                var authSession = {
                    authenticationTransaction: body
                };

                var userDetails = jwt.sign(body, config.jwtSignKey || 'ssshhhh', {expiresIn: 5 * 60});
                res.cookie(config.authCookieName, authSession, {
                    domain: req.hostname,
                    maxAge: config.authExpiryInSeconds,
                    httpOnly: true,
                    secure: true,
                    signed: true
                });
                res.redirect(redirectUri + "?state=" + state + "&userDetails=" + userDetails);

            } else {
                console.log(error);
                var err = config.errors.unidentified_user;
                res.redirect(redirectUri + "?state=" + state + "&error=" + err.code + "&description=" + err.description);
            }
        });
    }


};

module.exports = login;