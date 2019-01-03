"use strict";

// Import the required SDK (Pulumi and Azure)
const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");

let config = new pulumi.Config();
let numberofVMs = config.require("numberofVMs");

//import the reusable components 
const resourceGroupComponent = require("./create-resource-group.js"); 
const virtualMachineComponent = require("./create-vm.js"); 
const loadBalancerComponent = require("./create-lb.js"); 
const nsgComponent = require("./nsg.js"); 

let publicIPs = [];
let i;

// Create an Azure Resource Group
let resourceGroup = new resourceGroupComponent.ResourceGroup("pulumi-rg","EastUS");


// Call Load Balancer componenet to create and use exposed backend pool ID.
let azLB = new loadBalancerComponent.LB("pulumi-lb",resourceGroup.resourceGroupName,resourceGroup.location);
let backendPoolID = azLB.backendPoolID;


// Create Network security group using NetworkSecurityGroup compomenet for HTTP and RDP
let nsg = new nsgComponent.NetworkSecurityGroup("pulumi-nsg",resourceGroup.resourceGroupName,resourceGroup.location);


// Create a availability set for the VMs to be placed.
let avset = new azure.compute.AvailabilitySet("myAVSet", {
    resourceGroupName:resourceGroup.resourceGroupName,
    location: resourceGroup.location,
    platformFaultDomainCount: 2,
    platformUpdateDomainCount: 2,
    managed: true,
});

// Create Virtual Network
let network = new azure.network.VirtualNetwork("pulumiVnet", {
    resourceGroupName: resourceGroup.resourceGroupName,
    location: resourceGroup.location,
    addressSpaces: ["10.0.0.0/16"],
    // Workaround two issues:
    // (1) The Azure API recently regressed and now fails when no subnets are defined at Network creation time.
    // (2) The Azure Terraform provider does not return the ID of the created subnets - so this cannot actually be used.
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});



// Create subnet and associate the Network security group 
let subnet = new azure.network.Subnet("pulumiSubnet", {
    resourceGroupName: resourceGroup.resourceGroupName,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.2.0/24",
    //networkSecurityGroupId:nsg.nsgID,
    subnetNetworkSecurityGroupAssociation: {
    	networkSecurityGroupId:nsg.id
    }
});

// Create public IPs and respective VM.
for (i=0;i < numberofVMs; i++)
{
	let publicIP = new azure.network.PublicIp("pulumiIP"+i, {
		    resourceGroupName: resourceGroup.resourceGroupName,
		    location: resourceGroup.location,
		    publicIpAddressAllocation: "Dynamic",
		});

    publicIPs[i] = publicIP.id;

    // Create virtual machine with public IP and Virtual Network
    const vm = new virtualMachineComponent.VirtualMachine("pulumi-vm"+i,resourceGroup.resourceGroupName, resourceGroup.location, 
        publicIP,backendPoolID,subnet.id,avset.id,i);

}



