const jwt = require('jsonwebtoken');
const fs = require('fs');

// Apple Auth Secret Generator for SIFT
// Based on user-provided instructions

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgSfthxaGik8YOTdcn
J/nRDt0xWyM5LdjCfe46Uy+AdkugCgYIKoZIzj0DAQehRANCAASf5rHCrUN6BTCI
O0JsVNLvOu+Y90J11tUQL+tXO8ikeQ0yr4MHbntSRvlxePGVAaf5m7Nv/htDEtD5
aJAv7muo
-----END PRIVATE KEY-----`;

const TEAM_ID = '8DA3BAGA32'.trim();
const KEY_ID = 'PT39848THT'.trim();
const CLIENT_ID = 'com.hkjstudio.sift'.trim();

const token = jwt.sign({}, PRIVATE_KEY, {
    algorithm: 'ES256',
    expiresIn: '180d',
    issuer: TEAM_ID,
    subject: CLIENT_ID,
    audience: 'https://appleid.apple.com',
    header: {
        alg: 'ES256',
        kid: KEY_ID,
    },
});

console.log(token.replace(/\s/g, ''));
