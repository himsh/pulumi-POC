"use strict";
//import packages 
const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");
const azurestorage = require("azure-storage");
const mime = require("mime");

const prefix = pulumi.getStack().substring(0, 9);
let siteDir= "wwwroot";

const resourceGroup = require("./create-resource-group.js");


// Create an Azure Resource Group
let azureResouceGroup = new resourceGroup.ResourceGroup("rgtest","EastUS");


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


//For each file in the directory, create a blob
for (let item of require("fs").readdirSync(siteDir)) {
  let filePath = require("path").join(siteDir, item);

  let  blob = new azure.storage.Blob(item, {
    resourceGroupName: azureResouceGroup.resourceGroupName,
    storageAccountName: account.name,
    storageContainerName: storageContainer.name,
    source: filePath,
    type: "block",
    contentType:mime.getType(filePath) || undefined
  });

  const blobUrl = signedBlobReadUrl(blob, account, storageContainer);
  console.log(String(blobUrl));
  exports.blobUrl = blobUrl;
}


// Create sas URL  for the blob
function signedBlobReadUrl(blob,account,container)
 {
    // Choose a fixed, far-future expiration date for signed blob URLs.
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

//Export the connection string  for the storage account
exports.connectionString = account.primaryConnectionString;

