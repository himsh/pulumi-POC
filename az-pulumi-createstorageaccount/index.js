"use strict";
//import packages 
const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");
const azurestorage = require("azure-storage")

const prefix = pulumi.getStack().substring(0, 9);

const resourceGroup = require("./create-resource-group.js");


// Create an Azure Resource Group
let azureResouceGroup = new resourceGroup.ResourceGroup("rgtest","EastUS");

//console.log(azureResouceGroup.resourceGroupName);
//exports.location = azureResouceGroup.resourceGroupName;

// Create an Azure resource (Storage Account)
const storageAccountName = `${prefix.toLowerCase().replace(/-/g, "")}sa`;
const account = new azure.storage.Account(storageAccountName, {
    resourceGroupName: azureResouceGroup.resourceGroupName,
    location: azureResouceGroup.location,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

// Create a storage container
const storageContainer = new azure.storage.Container(`${prefix}-c`, {
    resourceGroupName: azureResouceGroup.resourceGroupName,
    storageAccountName: account.name,
    containerAccessType: "private",
});


// For each file in the directory, create an S3 object stored in `siteBucket`
// for (let item of require("fs").readdirSync("wwwroot")) {
//   let filePath = require("path").join(siteDir, item);
//   let blob = new azure.storage.Blob()
//   let object = new aws.s3.BucketObject(item, { 
//     bucket: siteBucket,
//     source: new pulumi.asset.FileAsset(filePath),     // use FileAsset to point to a file
//     contentType: mime.getType(filePath) || undefined, // set the MIME type of the file
//   });
// }


// Create a blob to store a simple index.html
const blob = new azure.storage.ZipBlob(`${prefix}-b`, {
    resourceGroupName: azureResouceGroup.resourceGroupName,
    storageAccountName: account.name,
    storageContainerName: storageContainer.name,
    type: "block",

    content: new pulumi.asset.FileArchive("wwwroot")
});

const blobUrl = signedBlobReadUrl(blob, account, storageContainer);


// Create sas URL  for the blob
function signedBlobReadUrl(blob,account,container)
 {
    // Choose a fixed, far-future expiration date for signed blob URLs.
    // The shared access signature (SAS) we generate for the Azure storage blob must remain valid for as long as the
    // Function App is deployed, since new instances will download the code on startup. By using a fixed date, rather
    // than (e.g.) "today plus ten years", the signing operation is idempotent.
    const signatureExpiration = new Date(2100, 1);

    return pulumi.all([
        account.primaryConnectionString,
        container.name,
        blob.name,
    ]).apply(([connectionString, containerName, blobName]) => {
        let blobService = new azurestorage.BlobService(connectionString);
        let signature = blobService.generateSharedAccessSignature(
            containerName,
            blobName,
            {
                AccessPolicy: {
                    Expiry: signatureExpiration,
                    Permissions: azurestorage.BlobUtilities.SharedAccessPermissions.READ,
                },
            }
        );

        return blobService.getUrl(containerName, blobName, signature);
    });
}

//Export the URL for the Blob
exports.blobUrl = blobUrl;
