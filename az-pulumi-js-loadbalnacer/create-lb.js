"use strict";

const azure = require("@pulumi/azure");
const pulumi = require("@pulumi/pulumi");

class LB extends pulumi.ComponentResource {
    constructor(lbname,resourceGroupName, location,path, opts)
    {
        super("az-pulumi-js-loadbalancer:LB",lbname, resourceGroupName,location, {}, opts); 

        // Create Load balancer Public IP
        const lbpip = new azure.network.PublicIp("lbpip", {
            resourceGroupName: resourceGroupName,
            location: location,
            publicIpAddressAllocation: "dynamic",
            domainNameLabel: `${pulumi.getStack()}`,
        },
        { 
           parent: this 
        });


        // Create Load Balancer
        let lb = new azure.lb.LoadBalancer(lbname, {
            resourceGroupName: resourceGroupName,
            location: location,
            frontendIpConfigurations: [{
                name: "LoadBalancerFrontEnd",
                publicIpAddressId: lbpip.id,
            }],
        },
        { 
           parent: this 
       });

        // Create backend pool
        let backendPool = new azure.lb.BackendAddressPool("backendPool", {
            resourceGroupName: resourceGroupName,
            loadbalancerId: lb.id,
        },
        { 
         parent: this 
        });


        // Create Health probe
        let lbprobe = new azure.lb.Probe("lbprobe", {
            resourceGroupName: resourceGroupName,
            loadbalancerId: lb.id,
            protocol: "tcp",
            port: 80,
            intervalInSeconds: 5,
            numberOfProbes: 2,
        },
        { 
           parent: this 
        });

          let lbrule = new azure.lb.Rule("lbrule", {
            resourceGroupName: resourceGroupName,
            loadbalancerId: lb.id,
            protocol: "tcp",
            frontendPort: 80,
            backendPort: 80,
            frontendIpConfigurationName: "LoadBalancerFrontEnd",
            enableFloatingIp: false,
            backendAddressPoolId: backendPool.id,
            idleTimeoutInMinutes: 5,
            probeId: lbprobe.id,
        },
        { 
           parent: this 
        });

    	// Create a property for the Backend Pool ID that was created
        this.backendPoolID = backendPool.id;

    }

}

module.exports.LB = LB;