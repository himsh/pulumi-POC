"use strict";

const azure = require("@pulumi/azure");
const pulumi = require("@pulumi/pulumi");



let config = new pulumi.Config();
let numberofVMs = config.require("numberofVMs");

let networkInterfaceIds = [];
let backendPoolID = "";

//Username/Password for 3 VMs
var usernames = ["testvm1","testvm2","testvm3"];
var passwords = ["testvm123!","testvm123!","testvm123!"];


class VirtualMachine extends pulumi.ComponentResource {
    constructor(vmName,rgName,location, publicIP,backendPoolID, subnetId,avSetId,count, path, opts)
    {

      super("az-pulumi-js-loadbalancer:VirtualMachine",vmName, rgName,location,publicIP,backendPoolID,subnetId,parseInt(count), {}, opts); 
       console.log(parseInt(count));

       // Create Network interface card and VMs
        
                const  networkInterface = new azure.network.NetworkInterface("pulumi-NIC" + parseInt(count), {
                    resourceGroupName: rgName,
                    location: location,
                    ipConfigurations: [{
                        name: "webserveripcfg"+count,
                        subnetId: subnetId,
                        privateIpAddressAllocation: "Dynamic",
                        publicIpAddressId: publicIP.id,
                        loadBalancerBackendAddressPoolsIds:[backendPoolID],
                    //loadBalancerInboundNatRulesIds:[natRules[i]],

                }],     
            },
            {
                parent: this
            }
            );

            // Create VM
            let vm = new azure.compute.VirtualMachine(vmName, {
                resourceGroupName: rgName,
                location: location,
                availabilitySetId: avSetId,
                vmSize: "Standard_D1",
                networkInterfaceIds: [networkInterface.id],
                storageImageReference: {
                    publisher: "MicrosoftWindowsServer",
                    offer: "WindowsServer",
                    sku: "2016-Datacenter",
                    version: "latest"
                },
                osProfileWindowsConfig: {},
                storageOsDisk: {
                    name: "osdisk"+count,
                    createOption: "FromImage"
                },
                osProfile: {
                    computerName: "pulumihost"+ count,
                    adminUsername: usernames[count],
                    adminPassword: passwords[count],
                },
            },
            {
                parent: this
            }
            );

            exports.publicIP = pulumi.all({ id: vm.id, name: publicIP.name, resourceGroupName: publicIP.resourceGroupName }).apply(ip =>
                azure.network.getPublicIP({
                    name: ip.name,
                    resourceGroupName: ip.resourceGroupName,
                }).then(ip => ip.ipAddress)
            );
        }

    }

 

 module.exports.VirtualMachine = VirtualMachine;