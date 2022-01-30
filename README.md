# App Store Connect APIs

In this project I explore some of the APIs that are useful to automate some of the tasks that I perform regularly on App Store Connect. 

### Get App Information
`curl -v -H 'Authorization: Bearer YOUR_TOKEN' "https://api.appstoreconnect.apple.com/v1/apps?filter[id]=YOUR_APP_ID"`

### Get App Price
`curl -v -H 'Authorization: Bearer YOUR_TOKEN' "https://api.appstoreconnect.apple.com/v1/apps/YOUR_APP_ID/prices?include=priceTier"`

### Change App Price
`PATCH https://api.appstoreconnect.apple.com/v1/apps/YOUR_APP_ID`

`Authorization: Bearer YOUR_TOKEN`

Body:

```
{
    "data": {
        "type": "apps",
        "id": "YOUR_APP_ID",
        "relationships": {
            "prices": {
                "data": [
                    { "type": "appPrices", "id": "${new-price-1}" }
                ]
            }
        }
    },
    "included": [{
        "id": "${new-price-1}",
        "type":"appPrices",
        "relationships": {
            "priceTier": {
                "data":{ "type": "priceTiers", "id": "5"}
            }
        }
    }]
}
```

### Get App Store Versions

Reference: https://developer.apple.com/documentation/appstoreconnectapi/list_all_app_store_versions_for_an_app

`GET https://api.appstoreconnect.apple.com/v1/apps/YOUR_APP_ID/appStoreVersions`

### Get App Store Version Localizations for an App Store Version

Reference: https://developer.apple.com/documentation/appstoreconnectapi/list_all_app_store_version_localizations_for_an_app_store_version

`GET https://api.appstoreconnect.apple.com/v1/appStoreVersions/YOUR_APP_VERSION_ID_FROM_PREVIOUS_CALL/appStoreVersionLocalizations`



### References
* WWDC Video: https://developer.apple.com/videos/play/wwdc2020/10004/
* Apple Developer Documentation: https://developer.apple.com/documentation/appstoreconnectapi/modify_an_app
