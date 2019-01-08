"use strict";
//import packages 
const pulumi = require("@pulumi/pulumi");
const resourceGroup = require("./create-resource-group.js");
const storageAccount = require("./create-azure-sa.js");

const prefix = pulumi.getStack().substring(0, 9);
let siteDir= "wwwroot";


// Create objects for  Azure Resource Group and Azure Storage account classes
let azureResouceGroup = new resourceGroup.ResourceGroup("rgtest","EastUS");
let objStorageAccount = new storageAccount.AzureStorageAccount();


// Create an Azure resource (Storage Account)
const account = objStorageAccount.createAzureStorageAccount(`${prefix.toLowerCase().replace(/-/g, "")}sa`,
    azureResouceGroup.resourceGroupName, azureResouceGroup.location);

console.log(account.name);

// Create a storage container
const storageContainer = objStorageAccount.createAzureStorageContainer(`${prefix}-c`,account.name, 
    azureResouceGroup.resourceGroupName);


//For each file in the directory, create a blob
for (let item of require("fs").readdirSync(siteDir)) {
  let filePath = require("path").join(siteDir, item);

  const blob = objStorageAccount.createBlob(item,account.name, storageContainer.name, azureResouceGroup.resourceGroupName, filePath);
  const blobUrl = objStorageAccount.signedBlobReadUrl(blob, account, storageContainer);

  exports.blobUrl = blobUrl;
}

//Export the connection string  for the storage account
exports.connectionString = account.primaryConnectionString;

