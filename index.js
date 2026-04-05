// By running this code you can get the price of your App Store Apps and you can quickly update them by modifying a CSV file. 
// Please refer to the running options at the bottom of the file and either run getPriceForApps() which creates the CSV file with current price for apps.
// Then you can modify the CSV file with new prices and then run updateAppPrices(). You need to fill in the information for ISSUER_ID and KEY_ID 

// Consider using:
// https://www.npmjs.com/package/commander
// https://www.npmjs.com/package/inquirer

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
// The following values can be retrieved by going tp your App Store Connect Account > Users and Access > Keys > App Store Connect API
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
  try {
    const apps = await getApps();

    // Map the apps into a clean format for the table
    const appTable = apps.map(app => ({
      "App Name": app.name,
      "App ID": app.id,
      "Bundle ID": app.bundleId
    }));

    console.log(`\n--- LIST OF APPS (${apps.length} found) ---`);

    if (appTable.length > 0) {
      console.table(appTable);
    } else {
      console.log("No apps found with status READY_FOR_SALE.");
    }
  } catch (error) {
    console.error("Error printing apps table:", error.message);
  }
}

function getPriceForApp(app) {
  let appId = app.id;
  const url = `https://api.appstoreconnect.apple.com/v1/appPriceSchedules/${appId}//manualPrices?filter[territory]=USA&include=appPricePoint`;
  return new Promise((resolve, reject) => {
    axios.get(url, { headers: authHeadersForAppStoreConnect })
    .then(response => {
      let data = response.data.data;
      const included = response.data.included;

      let currentPrice = "N/A";

      if (data && data.length > 0 && included) {
        const usPriceRecord = data[0]
        const pricePointId = usPriceRecord.relationships.appPricePoint.data.id;
        const pricePoint = included.find(item => item.id === pricePointId);
        currentPrice = pricePoint ? pricePoint.attributes.customerPrice : "N/A";
      }

      resolve({
        id: app.id,
        name: app.name,
        bundleId: app.bundleId,
        price: currentPrice,
      });
    })
    .catch(reason => {
      console.error("Error fetching app price details:", reason.response ? JSON.stringify(reason.response.data, null, 2) : reason.message);
      reject(reason);
    })
  });
}

async function getPriceForApps() {
  try {
    let apps = await getApps();
    console.log(`Fetching prices for ${apps.length} apps...`);

    let promises = apps.map(app => getPriceForApp(app));
    let rawPrices = await Promise.all(promises);

    // 1. Prepare data for the console table (Friendly Headers)
    const tableData = rawPrices.map(item => ({
      "App Name": item.name,
      "App ID": item.id,
      "Bundle ID": item.bundleId,
      "Price (US)": `$${item.price}`
    }));

    console.log("\n--- CURRENT APP PRICES ---");
    console.table(tableData);

    // 2. Writes as a .csv file
    await csvWriter.writeRecords(rawPrices);
    console.log('CSV file (prices.csv) has been saved.');

    // 3. Writes as a JSON file
    let jsonContent = JSON.stringify(rawPrices, null, 2);
    fs.writeFileSync("output.json", jsonContent, 'utf8');
    console.log("JSON file (output.json) has been saved.");

  } catch (error) {
    console.error("Error in getPriceForApps:", error.message);
  }
}

async function getPricePointId(appId, targetPrice) {
  const url = `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appPricePoints?filter[territory]=USA&limit=200`;
  const response = await axios.get(url, { headers: authHeadersForAppStoreConnect });

  // Find the price point record that matches your CSV's decimal price
  const pricePoint = response.data.data.find(pp =>
    parseFloat(pp.attributes.customerPrice) === parseFloat(targetPrice)
  );

  if (!pricePoint) {
    throw new Error(`Could not find a US Price Point for ${targetPrice}`);
  }
  return pricePoint.id;
}

async function updatePriceForApp(app, newPrice) {
  try {
    console.log(`Updating price for app ${app.id} to $${newPrice}...`);

    // Step 1: Get the correct Price Point ID for the US
    const pricePointId = await getPricePointId(app.id, newPrice);

    // Step 2: Create the Price Schedule payload
    const data = {
      "data": {
        "type": "appPriceSchedules",
        "relationships": {
          "app": {
            "data": { "type": "apps", "id": app.id }
          },
          "baseTerritory": {
            "data": { "type": "territories", "id": "USA" }
          },
          "manualPrices": {
            "data": [
              { "type": "appPrices", "id": "${new-price-1}" }
            ]
          }
        }
      },
      "included": [
        {
          "type": "appPrices",
          "id": "${new-price-1}",
          "relationships": {
            "appPricePoint": {
              "data": { "type": "appPricePoints", "id": pricePointId }
            }
          }
        }
      ]
    };

    // Step 3: POST to the new schedules endpoint
    await axios.post(`https://api.appstoreconnect.apple.com/v1/appPriceSchedules`, data, {
      headers: authHeadersForAppStoreConnect
    });

    console.log(`Successfully updated ${app.name} to $${newPrice}`);
  } catch (error) {
    const errorDetail = error.response ? JSON.stringify(error.response.data.errors) : error.message;
    console.error(`Failed to update ${app.name}:`, errorDetail);
  }
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

async function getPriceForIAP(iapId) {
  try {
    // 1. Get the price schedule ID for this specific IAP
    const scheduleUrl = `https://api.appstoreconnect.apple.com/v2/inAppPurchases/${iapId}/iapPriceSchedule`;
    const scheduleResponse = await axios.get(scheduleUrl, { headers: authHeadersForAppStoreConnect });

    // The IAP ID and its Schedule ID are usually the same, but we fetch it to be safe
    const scheduleId = scheduleResponse.data.data.id;

    // 2. Fetch the manual prices for the USA storefront
    const pricesUrl = `https://api.appstoreconnect.apple.com/v1/inAppPurchasePriceSchedules/${scheduleId}/manualPrices?filter[territory]=USA&include=inAppPurchasePricePoint`;
    const priceResponse = await axios.get(pricesUrl, { headers: authHeadersForAppStoreConnect });

    if (priceResponse.data.data.length > 0 && priceResponse.data.included) {
      const manualPriceRecord = priceResponse.data.data[0];
      const pricePointId = manualPriceRecord.relationships.inAppPurchasePricePoint.data.id;

      // Find the actual price in the 'included' Price Point object
      const pricePoint = priceResponse.data.included.find(p => p.id === pricePointId);
      return pricePoint ? pricePoint.attributes.customerPrice : "0.00";
    }
    return "0.00"; // Default if no manual price is set
  } catch (error) {
    // Some IAPs might not have a price schedule yet if they are brand new
    return "N/A";
  }
}

async function listAllIAPDetails() {
  try {
    const apps = await getApps();
    const finalReport = [];

    console.log(`Searching ${apps.length} apps for In-App Purchases...`);

    for (const app of apps) {
      const iaps = await getInAppPurchasesFor(app);

      for (const iap of iaps) {
        process.stdout.write(`Fetching price for: ${iap.name}... `);
        const price = await getPriceForIAP(iap.id);
        console.log(`$${price}`);

        finalReport.push({
          "App Name": app.name,
          "App ID": app.id,
          "Bundle ID": app.bundleId,
          "IAP Name": iap.name,
          "IAP ID": iap.id,
          "Product ID": iap.productId,
          "Price (US)": `$${price}`
        });
      }
    }

    console.log("\n--- COMPLETE IN-APP PURCHASE LIST ---");
    console.table(finalReport);

    // Save to CSV
    const csvWriterIAP = csvwriter.createObjectCsvWriter({ path: 'iap_list.csv', header: Object.keys(finalReport[0]).map(k => ({id: k, title: k})) });
    await csvWriterIAP.writeRecords(finalReport);

    return finalReport;
  } catch (error) {
    console.error("Failed to list IAP details:", error.message);
  }
}

function getInAppPurchasesFor(app) {
  let appId = app.id
  return new Promise((resolve, reject) => {
    axios.get(`https://api.appstoreconnect.apple.com/v1/apps/${appId}/inAppPurchasesV2`, { headers: authHeadersForAppStoreConnect })
      .then( response => {
        let inAppPurchasesResponse = response.data.data;
        inAppPurchases = [];
        inAppPurchasesResponse.forEach(inAppPurchaseResponse => {
          inAppPurchases.push({id: inAppPurchaseResponse.id, name: inAppPurchaseResponse.attributes.name, productId: inAppPurchaseResponse.attributes.productId })
        });
        resolve(inAppPurchases);
      })
      .catch( reason => {
        reject(reason);
      })
    });
  }

  async function getIAPPricePointId(iapId, targetPrice) {
    // Corrected 2026 endpoint for IAP price points
    const url = `https://api.appstoreconnect.apple.com/v2/inAppPurchases/${iapId}/pricePoints?filter[territory]=USA&limit=200`;

    try {
      const response = await axios.get(url, { headers: authHeadersForAppStoreConnect });

      // Find the price point that matches your CSV decimal
      const pricePoint = response.data.data.find(pp =>
        parseFloat(pp.attributes.customerPrice) === parseFloat(targetPrice)
      );

      if (!pricePoint) {
        throw new Error(`Price $${targetPrice} not available for IAP ${iapId}`);
      }
      return pricePoint.id;
    } catch (error) {
      console.error(`Error finding Price Point for $${targetPrice}:`, error.message);
      throw error;
    }
  }

  async function updatePriceForIAP(iapId, newPrice) {
    try {
      // 1. Get the ID for the price
      const pricePointId = await getIAPPricePointId(iapId, newPrice);

      // 2. Build the payload
      const payload = {
        "data": {
          "type": "inAppPurchasePriceSchedules",
          "relationships": {
            "inAppPurchase": {
              "data": { "type": "inAppPurchases", "id": iapId }
            },
            "baseTerritory": {
              "data": { "type": "territories", "id": "USA" }
            },
            "manualPrices": {
              "data": [{ "type": "inAppPurchasePrices", "id": "${temp-id}" }]
            }
          }
        },
        "included": [
          {
            "type": "inAppPurchasePrices",
            "id": "${temp-id}",
            "relationships": {
              "inAppPurchasePricePoint": {
                "data": { "type": "inAppPurchasePricePoints", "id": pricePointId }
              }
            }
          }
        ]
      };

      await axios.post(`https://api.appstoreconnect.apple.com/v1/inAppPurchasePriceSchedules`, payload, {
        headers: authHeadersForAppStoreConnect
      });

      console.log(`✅ Successfully updated IAP ${iapId} to $${newPrice}`);
    } catch (error) {
      console.error(`❌ Failed to update IAP ${iapId}:`, error.response ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  async function updateIAPPricesFromCSV() {
    const iapRows = [];

    // Note: Ensure the filename matches what you saved (e.g., 'iap_list.csv')
    fs.createReadStream('iap_list.csv')
    .pipe(csvparser())
    .on('data', (row) => iapRows.push(row))
    .on('end', async () => {
      console.log(`Processing ${iapRows.length} In-App Purchases from CSV...`);

      for (const row of iapRows) {
        // Mapping headers from listAllIAPDetails:
        const iapId = row['IAP ID'];
        const productName = row['IAP Name'];
        // Remove '$' and spaces from the price column
        const cleanPrice = row['Price (US)'].replace('$', '').trim();

        if (iapId && cleanPrice) {
          process.stdout.write(`Updating ${productName}... `);
          await updatePriceForIAP(iapId, cleanPrice);
        }
      }
      console.log('--- Update Complete ---');
    });
  }

  // Running Options

  // 0
  // printApps();

  // 1
   getPriceForApps()

  // 2
  // updateAppPrices()

  // 3
  // listAllIAPDetails()

  //4
  // updateIAPPricesFromCSV()
