"use strict";

const azure = require("@pulumi/azure");
const pulumi = require("@pulumi/pulumi");

class ResourceGroup extends pulumi.ComponentResource {
    constructor(resourceGroupName, location,path, opts)
    {
    	 super("az-pulumi-js-loadbalancer:ResourceGroup", resourceGroupName,location, {}, opts); 

         console.log(`Resource Group ${resourceGroupName} : location ${location} `);
    	 // Create an Azure Resource Group
		const resourceGroup = new azure.core.ResourceGroup(resourceGroupName, 
		{
		    location:location,
		},

        { 
           parent: this 
        }
		);

		// Create a property for the resource group name that was created
        this.resourceGroupName = resourceGroup.name,
        this.location = location
        

         // For dependency tracking, register output properties for this component
        this.registerOutputs({
            resourceGroupName: this.resourceGroupName,
           
        });

    }

}

module.exports.ResourceGroup = ResourceGroup;