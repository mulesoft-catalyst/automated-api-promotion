// Anypoint Runtime Manager API Wrapper
// Implements API calls required to promote application

const Req = require("request");
const Promise = require("promise");

/*
 * Retrieves application IDs for provided environment and list of application from configuration
 */
function getApplications(token, orgId, envId, applicationsFromConfig) {
	return new Promise(function(resolve, reject) {

		Req.get({
			"headers": {"content-type": "application/json", "Authorization": token, "X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId}, 
			"url": "https://anypoint.mulesoft.com/hybrid/api/v1/applications"
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
			    var jsonBody = JSON.parse(body);

			    var applicationsToBePromoted = [];
			    applicationsFromConfig.forEach(function(app) {
					var application = jsonBody.data.find(function(item) {
		  				return item.name == app.appName;
					});
					applicationsToBePromoted.push({
						"appName": app.appName,
						"appId": application.id,
						"apiInstanceId": app.apiInstanceId});
				});
			    
				resolve(applicationsToBePromoted);
		    }

		});

	});
}

/*
 * Retrieves server ID by server name for provided environment.
 * Promise is used to merge responses from asynchronous calls.
 */
function getServer(token, orgId, envId, serverName) {
	return new Promise(function(resolve, reject) {
		Req.get({
			"headers": {"Authorization": token, "X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId}, 
			"url": "https://anypoint.mulesoft.com/hybrid/api/v1/servers"
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
			    var jsonBody = JSON.parse(body);

			    var server = jsonBody.data.find(function(item) {
		  			return item.name == serverName;
				});

				resolve(server.id);
		    }

		});

	});
}

/*
 * Retrieves cluster ID by cluster name for provided environment.
 */
function getCluster(token, orgId, envId, clusterName) {
	return new Promise(function(resolve, reject) {
		Req.get({
			"headers": {"Authorization": token, "X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId}, 
			"url": "https://anypoint.mulesoft.com/hybrid/api/v1/clusters"
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
			    var jsonBody = JSON.parse(body);

			    var cluster = jsonBody.data.find(function(item) {
		  			return item.name == clusterName;
				});

				resolve(cluster.id);
		    }

		});

	});
}

/*
 * Deployes a fresh application or if application already exists undeployes it and deployes a new version
 * from environment configure as source
 */
function redeployApplication(token, orgId, envId, runtimeId, appName, appId, originApiInstanceId, apiInstances) {
	return getApplicationId(token, orgId, envId, appName).then(targetAppId => {

		//get api instance id for provided application and its origin API instance ID 
		//	- application that is being deployed		
		var apiInstance = {};
		var apiInstanceId = null;
		if(apiInstances != null) {
			apiInstance = apiInstances.find(function(item) {
		  			return item.originApiInstanceId == originApiInstanceId;
			});
			if(apiInstance != null) {
				apiInstanceId = apiInstance.apiInstanceId;
			}
		}			

		if(targetAppId != null) {
			console.log("Application with name '%s' and ID: '%s' is being redeployed. API Instance ID for app is: '%s'", 
				appName, targetAppId, apiInstanceId);
			return updateAppOnTarget(token, orgId, envId, targetAppId, appId, appName, apiInstanceId);
		} else {
			console.log("Application with name '%s' and API instance ID '%s' is being deployed.", 
				appName, apiInstanceId);
			if(apiInstanceId == null) {
				console.log("WARNING WARNING WARNING: API instance ID has NOT been found for application name: %s. " + 
					"Application will NOT be registered with API Manager.", appName);
			}
			return deployToTarget(token, orgId, envId, appId, runtimeId, appName, apiInstanceId);
		}
	})
	.catch(err => {
		console.log("Error: " + err);
		process.exit(-1);
	});
}

/*
 * Returns application ID if application exists on the environment, otherwise returns null
 */
function getApplicationId(token, orgId, envId, appName) {
	return new Promise(function(resolve, reject) {
		Req.get({
			"headers": {"content-type": "application/json", "Authorization": token, "X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId}, 
			"url": "https://anypoint.mulesoft.com/hybrid/api/v1/applications"
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
			    var jsonBody = JSON.parse(body);	
				var application = jsonBody.data.find(function(item) {
	  				return item.name == appName;
				});
				
				if(application) {
					console.log("Application with name: '" + appName + "' already exists on the server. Application will be patched.");
					resolve(application.id);
				} else {
					console.log("Application with name: '" + appName + "' not found. Fresh deployment will be triggered.");
					resolve(null);
				}							    				
		    }
		});

	});
}

/*
 * Updates the application if it already exists on the target runtime.
 */
function updateAppOnTarget(token, orgId, envId, appIdToBeUpdated, sourceAppId, targetAppName, apiInstanceId) {
	//prepare body
	var body = {};
	//update API instance configuration - register APP with the new API instance
	if(apiInstanceId != null) {
		body = {
	    	"applicationSource":{"id":sourceAppId,"source":"HYBRID"},
	        "configuration": {
	        	"mule.agent.application.properties.service": {
	        		"applicationName": targetAppName,
	        		"properties": {"api.instance": new String(apiInstanceId)}
	        	}
	        }
		};
	} 
	//do NOT update API instance configuration - register APP with the existing API instance
	else {
		body = {"applicationSource":{"id":sourceAppId,"source":"HYBRID"}};
	}
	
	return new Promise(function(resolve, reject) {
		Req.patch({
		    "headers": { "content-type": "application/json", "Authorization": token, 
		    	"X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId
			},
		    "url": "https://anypoint.mulesoft.com/hybrid/api/v1/applications/"+appIdToBeUpdated+"/artifact",
		    "body": JSON.stringify(body)
		}, (error, response, body) => {
			if(error) {
				reject(error);
			} else {
				jsonBody = JSON.parse(body);
				console.log("Application deployed: " + appIdToBeUpdated);
				resolve(jsonBody);
			}
		});
	});
}

/*
 * Deployes defined application to target environment and server, e.g. PROD
 */
function deployToTarget(token, orgId, envId, appId, targetId, appName, apiInstanceId) {
	return new Promise(function(resolve, reject) {
		Req.post({
		    "headers": { "content-type": "application/json", "Authorization": token, 
		    	"X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId
			},
		    "url": "https://anypoint.mulesoft.com/hybrid/api/v1/applications",
		    "body": JSON.stringify({
		        "applicationSource": {"source": "HYBRID", "id": appId},
		        "targetId": targetId,
		        "artifactName": appName,
		        "configuration": {
		        	"mule.agent.application.properties.service": {
		        		"applicationName": appName,
		        		"properties": {"api.instance": new String(apiInstanceId)}
		        	}
		        }
		    })
		}, (error, response, body) => {
			if(error) {
				reject(error);
			} else {
				jsonBody = JSON.parse(body);
				console.log("Application deployed: " + appName);
				resolve(jsonBody);
			}
		});
	});
}

/*
 * Undeployes application
 */
function undeployApplication(token, orgId, envId, appId) {
	return new Promise(function(resolve, reject) {

		Req.delete({
			"headers": {"content-type": "application/json", "Authorization": token, "X-ANYPNT-ORG-ID": orgId, "X-ANYPNT-ENV-ID": envId}, 
			"url": "https://anypoint.mulesoft.com/hybrid/api/v1/applications/"+appId
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
		    	// there is no body as this is delete http method
				resolve("undeployed");									    				
		    }
		});

	});
}

module.exports.getApplications 						= getApplications;
module.exports.getServer 							= getServer;
module.exports.getCluster 							= getCluster;
module.exports.redeployApplication 					= redeployApplication;