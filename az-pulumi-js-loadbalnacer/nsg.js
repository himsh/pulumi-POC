"use strict";
// Creates the network security group and the associated rules for the NSG. 
// This NSG is attached to the network interface to allow the inbound traffic.

const azure = require("@pulumi/azure");
const pulumi = require("@pulumi/pulumi");

class NetworkSecurityGroup extends pulumi.ComponentResource {
    constructor(nsgName,resourceGroupName,location,path, opts)
    {
      super("az-pulumi-js-loadbalancer:NetworkSecurityGroup",nsgName, resourceGroupName,location, {}, opts); 

    // Create Azure Network security group for HTTP and RDP 
      const nsg = new azure.network.NetworkSecurityGroup(nsgName,
      {
        resourceGroupName: resourceGroupName,
        location: location,
        securityRules:[{
            sourcePortRange: "*",
            destinationPortRange:"80",
            sourceAddressPrefix:"*",
            destinationAddressPrefix:"*",
            direction:"Inbound",
            protocol: "TCP",
            access: "allow",
            priority: "100",
            name:"Allow_80"
        },
        {
            sourcePortRange: "*",
            destinationPortRange:"3389",
            sourceAddressPrefix:"*",
            destinationAddressPrefix:"*",
            direction:"Inbound",
            protocol: "TCP",
            access: "allow",
            priority: "200",
            name:"Allow_RDP"
        }],

    },{parent: this});

		// Create a property for the resource group name that was created
        this.nsgID = nsg.id;
       
    
     }

 }

 // export network security group to be used by other files/classes.
 module.exports.NetworkSecurityGroup = NetworkSecurityGroup;