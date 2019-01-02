"use strict";

const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");

let virtualMachines = [];
let networkInterfaceIds = [];
let natRules = [];
let publicIPs =[];

let config = new pulumi.Config();
let numberofVMs = config.require("numberofVMs");

//Username/Password for 3 VMs
var usernames = ["testvm1","testvm2","testvm3"];
var passwords = ["testvm123!","testvm123!","testvm123!"];

let resourceGroup = new azure.core.ResourceGroup("pulumi-rg", {
    location: "East US",
});

// let storageaccount = new azure.storage.Account("pulumiStorageAcnt", {
//     resourceGroupName: resourceGroup.name,
//     location: resourceGroup.location,
//     accountTier: "standard",
//     accountReplicationType: "LRS",
// });

let avset = new azure.compute.AvailabilitySet("myAVSet", {
    resourceGroupName:resourceGroup.name,
    location: resourceGroup.location,
    platformFaultDomainCount: 2,
    platformUpdateDomainCount: 2,
    managed: true,
});

const lbpip = new azure.network.PublicIp("lbpip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIpAddressAllocation: "dynamic",
    domainNameLabel: `${pulumi.getStack()}`,
});

let network = new azure.network.VirtualNetwork("pulumiVnet", {
    resourceGroupName: resourceGroup.name,
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

let lb = new azure.lb.LoadBalancer("lb", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    frontendIpConfigurations: [{
        name: "LoadBalancerFrontEnd",
        publicIpAddressId: lbpip.id,
    }],
});

let backendPool = new azure.lb.BackendAddressPool("backendPool", {
    resourceGroupName: resourceGroup.name,
    loadbalancerId: lb.id,
});


let lbprobe = new azure.lb.Probe("lbprobe", {
    resourceGroupName: resourceGroup.name,
    loadbalancerId: lb.id,
    protocol: "tcp",
    port: 80,
    intervalInSeconds: 5,
    numberOfProbes: 2,
});

let lbrule = new azure.lb.Rule("lbrule", {
    resourceGroupName: resourceGroup.name,
    loadbalancerId: lb.id,
    protocol: "tcp",
    frontendPort: 80,
    backendPort: 80,
    frontendIpConfigurationName: "LoadBalancerFrontEnd",
    enableFloatingIp: false,
    backendAddressPoolId: backendPool.id,
    idleTimeoutInMinutes: 5,
    probeId: lbprobe.id,
});

let nsg = new azure.network.NetworkSecurityGroup("pulumi-nsg",
{
	resourceGroupName: resourceGroup.name,
	location: resourceGroup.location,
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
	},
	],

});

let subnet = new azure.network.Subnet("pulumiSubnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.2.0/24",
    networkSecurityGroupId:nsg.id,
    // subnetNetworkSecurityGroupAssociation: {
    // 	networkSecurityGroupId:nsg.id

    // }
});


for (let i=0;i < numberofVMs; i++)
{
	let publicIP = new azure.network.PublicIp("pulumiIP"+i, {
		    resourceGroupName: resourceGroup.name,
		    location: resourceGroup.location,
		    publicIpAddressAllocation: "Dynamic",
		});

    publicIPs[i] = publicIP.id;
}

// for (let i=0;i < numberofVMs; i++)
// {
// 	let tcp = new azure.lb.NatRule("tcp"+i, {
// 	    resourceGroupName: resourceGroup.name,
// 	    loadbalancerId: lb.id,
// 	    protocol: "tcp",
// 	    frontendPort: 5000 + i,
// 	    backendPort: 3389,
// 	    frontendIpConfigurationName: "LoadBalancerFrontEnd",
// 	  });

// 	natRules[i] = tcp.id;

// }

for (let i=0;i < numberofVMs; i++)
{

	  let networkInterface = new azure.network.NetworkInterface("pulumiServerNic"+i, {
		    resourceGroupName: resourceGroup.name,
		    location: resourceGroup.location,
		    ipConfigurations: [{
		        name: "webserveripcfg"+i,
		        subnetId: subnet.id,
		        privateIpAddressAllocation: "Dynamic",
                publicIpAddressId: publicIPs[i],
		        loadBalancerBackendAddressPoolsIds:[backendPool.id],
		        //loadBalancerInboundNatRulesIds:[natRules[i]],

		    }],	    
		});

   networkInterfaceIds[i] = networkInterface.id;
}

 
for (let i=0;i < numberofVMs; i++)
{
   console.log(i);

    let vm = new azure.compute.VirtualMachine("pulumi-vm"+i, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    availabilitySetId: avset.id,
    vmSize: "Standard_D1",
    networkInterfaceIds: [networkInterfaceIds[i]],
    storageImageReference: {
        publisher: "MicrosoftWindowsServer",
        offer: "WindowsServer",
        sku: "2016-Datacenter",
        version: "latest"
    },
    osProfileWindowsConfig: {},
    storageOsDisk: {
        name: "osdisk"+i,
        createOption: "FromImage"
    },
    osProfile: {
        computerName: "pulumihost"+ i,
        adminUsername: usernames[i],
        adminPassword: passwords[i],
    },
  });
}