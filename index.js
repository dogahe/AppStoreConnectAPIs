// By running this code you can get the price of your App Store Apps and you can quickly update them by modifying a CSF file. 
// Please refer to the running options at the bottom of the file and either run getPriceForApps() which creates the CSV file with current price for apps.
// Then you can modify the CSV file with new prices and then run updateAppPrices(). You need to fill in the information for ISSUER_ID and KEY_ID 

const fs = require('fs');
const csvwriter = require('csv-writer');
const csvparser = require('csv-parser');

console.log(`App Store Connect API`);

var createCsvWriter = csvwriter.createObjectCsvWriter
const csvWriter = createCsvWriter({
  path: 'prices.csv',
  header: [
    {id: 'id', title: 'id'},
    {id: 'name', title: 'name'},
    {id: 'bundleId', title: 'bundleId'},
    {id: 'price', title: 'price'},
  ]
});

// Generate the token
var jwt = require('jsonwebtoken');
ISSUER_ID =
KEY_ID = 
expiration = Math.floor(Date.now() / 1000) + (10 * 60)
var privateKey = fs.readFileSync(`./AppStoreConnectAPIKey/AuthKey_${KEY_ID}.p8`);
var token = jwt.sign({ iss: ISSUER_ID, exp: expiration, aud: 'appstoreconnect-v1' }, privateKey, { algorithm: 'ES256', keyid: KEY_ID });
console.log(token);


const authHeadersForAppStoreConnect = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + token
};

const axios = require('axios');

// Get List of Apps
async function getApps() {
  try {
    const response = await axios.get('https://api.appstoreconnect.apple.com/v1/apps?filter[appStoreVersions.appStoreState]=READY_FOR_SALE', { headers: authHeadersForAppStoreConnect });
    let responseApps = response.data.data;
    apps = [];
    responseApps.forEach(responseApp => {
      apps.push({id: responseApp.id, name: responseApp.attributes.name, bundleId: responseApp.attributes.bundleId })
    });
    return apps;
  }
  catch(error) {
    console.log(error);
  }
}

async function printApps() {
  let apps = await getApps();
  console.log(apps.length);
  apps.forEach(app => {
    console.log("============");
    console.log(app.id);
    console.log(app.name);
    console.log(app.bundleId);
  });
}

function getPriceForApp(app) {
  let appId = app.id
  return new Promise((resolve, reject) => {
    axios.get(`https://api.appstoreconnect.apple.com/v1/apps/${appId}/prices?include=priceTier`, { headers: authHeadersForAppStoreConnect })
    .then( response => {
      let responsePrice = response.data.data;
      resolve({ id: app.id, name: app.name, bundleId: app.bundleId, price: responsePrice[0].relationships.priceTier.data.id });
    })
    .catch( reason => {
      reject(reason);
    })
  });
}

async function getPriceForApps() {
  let apps = await getApps();
  let promises = []
  apps.forEach(app => {
    let p = getPriceForApp(app)
    promises.push(p)
  })
  Promise.all(promises).then(price => {
      let prices = [].concat.apply([], price);
      console.log(prices)

      // Writes as a .csv file
      csvWriter.writeRecords(prices).then(()=> console.log('CSV file has been saved.'));

      // Writes as a JSON file
      let jsonContent = JSON.stringify(prices);
      fs.writeFile("output.json", jsonContent, 'utf8', function (err) {
          if (err) {
              console.log("An error occured while writing JSON Object to File.");
              return console.log(err);
          }
          console.log("JSON file has been saved.");
      });
  }).catch()
}

function updatePriceForApp(app, newPrice) {
  console.log(`Updating price for app ${app.id} to ${newPrice}`);
  let appId = app.id
  var data = JSON.stringify({
    "data": {
      "type": "apps",
      "id": appId,
      "relationships": {
        "prices": {
          "data": [
            {
              "type": "appPrices",
              "id": "${new-price-1}"
            }
          ]
        }
      }
    },
    "included": [
      {
        "id": "${new-price-1}",
        "type": "appPrices",
        "relationships": {
          "priceTier": {
            "data": {
              "type": "appPriceTiers",
              "id": newPrice
            }
          }
        }
      }
    ]
  });
  return new Promise((resolve, reject) => {
    axios.patch(`https://api.appstoreconnect.apple.com/v1/apps/${appId}`, data, { headers: authHeadersForAppStoreConnect })
      .then( resolve() )
      .catch( reason => {
        console.log(reason)
        reject(reason);
      })
    });
  }

async function updateAppPrices() {
  const apps = [];
  fs.createReadStream('prices.csv')
    .pipe(csvparser())
    .on('data', (data) => apps.push(data))
    .on('end', () => {
      console.log(apps);
      apps.forEach(app => {
        updatePriceForApp(app, app.price)
      })
    });
}

// Running Options

printApps();

// 1
getPriceForApps()

// 2
//updateAppPrices()
  
