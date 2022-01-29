const fs = require('fs');
console.log(`App Store Connect API`);

// Generate the token
var jwt = require('jsonwebtoken');
ISSUER_ID = "YOUR_ISSUER_ID"
KEY_ID = "YOUR_KEY_ID"
expiration = Math.floor(Date.now() / 1000) + (10 * 60)
var privateKey = fs.readFileSync(`./AppStoreConnectAPIKey/AuthKey_${KEY_ID}.p8`);
var token = jwt.sign({ iss: ISSUER_ID, exp: expiration, aud: 'appstoreconnect-v1' }, privateKey, { algorithm: 'ES256', keyid: KEY_ID });
console.log(token);
