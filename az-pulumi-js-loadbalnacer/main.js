"use strict";

const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");

let config = new pulumi.Config();
let numberofVMs = config.require("numberofVMs");

const resourceGroupComponent = require("./create-resource-group.js");
const virtualMachineComponent = require("./create-vm.js");
const loadBalancerComponent = require("./create-lb.js");
const nsgComponent = require("./nsg.js");

let publicIPs = [];
var i = 0;

// Create an Azure Resource Group
let resourceGroup = new resourceGroupComponent.ResourceGroup("pulumi-rg","EastUS");


// Call Load Balancer componenet to create and use exposed backend pool ID.
let azLB = new loadBalancerComponent.LB("pulumi-lb",resourceGroup.resourceGroupName,resourceGroup.location);
let backendPoolID = azLB.backendPoolID;
//onsole.log(backendPoolID);

// Create Network security group for HTTP and RDP
let nsg = new nsgComponent.NetworkSecurityGroup("pulumi-nsg",resourceGroup.resourceGroupName,resourceGroup.location);


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



// Create subnet
let subnet = new azure.network.Subnet("pulumiSubnet", {
    resourceGroupName: resourceGroup.resourceGroupName,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.2.0/24",
    networkSecurityGroupId:nsg.nsgID,
    // subnetNetworkSecurityGroupAssociation: {
    // 	networkSecurityGroupId:nsg.id

    // }
});

// Create public IPs and respective VM.
for (i=0;i < numberofVMs; i++)
{
	let publicIP = new azure.network.PublicIp("pulumiIP"+i, {
		    resourceGroupName: resourceGroup.resourceGroupName,
		    location: resourceGroup.location,
		    publicIpAddressAllocation: "Dynamic",
		});

    //count = i;
    publicIPs[i] = publicIP.id;
    let vm = new virtualMachineComponent.VirtualMachine("pulumi-vm"+i,resourceGroup.resourceGroupName, resourceGroup.location, 
        publicIP,backendPoolID,subnet.id,avset.id,i);

  

}



