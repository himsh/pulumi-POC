"use strict";


const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");
const azurestorage = require("azure-storage");
const mime = require("mime");


class AzureStorageAccount
{ 
	constructor(){
		
	}

   
	createAzureStorageAccount(storageAccountName,rgName, rgLocation)
	{
		const account = new azure.storage.Account(storageAccountName, {
   		resourceGroupName: rgName,
    	location: rgLocation,
    	accountTier: "Standard",
    	accountReplicationType: "LRS",
	 });

		return account;
	}

	createAzureStorageContainer(containerName, storageAccountName,rgName)
	{
			const storageContainer = new azure.storage.Container(containerName, {
		    resourceGroupName: rgName,
		    storageAccountName: storageAccountName,
		    containerAccessType: "private",
		});

			return storageContainer;
	}

	// create blob
	createBlob(blobName,containerName, storageAccountName, rgName, filePath)
	{
		const  blob = new azure.storage.Blob(blobName, {
		    resourceGroupName: rgName,
		    storageAccountName: storageAccountName,
		    storageContainerName: containerName,
		    source: filePath,
		    type: "block",
		    contentType:mime.getType(filePath) || undefined
		 });

		return blob;
	}

	// Create sas URL  for the blob
    signedBlobReadUrl(blob,account,container)
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

}

module.exports.AzureStorageAccount = AzureStorageAccount;

