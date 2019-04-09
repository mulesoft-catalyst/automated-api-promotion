// Anypoint API Manager API Wrapper
// Implements API calls required to promote API

const Req = require("request");
const Promise = require("promise");

/*
 * Promote all the APIs defined in configuratin file
 */
function promoteApis(apis, anypointInfo) {

	return Promise.all(apis.map((api) => {
		console.log("Api Instance ID: " + api.apiInstanceId);
		return promoteApi(api.apiInstanceId, anypointInfo);
	}));

}

/*
 * Promotes API from source environment to the target environment. API is defined by API ID.
 * Returns api asset id and api version in JSON format.
 */
function promoteApi(apiId, anypointInfo) {

	return new Promise(function(resolve, reject) {

		Req.post({
			"headers": {"content-type": "application/json", "Authorization": anypointInfo.token}, 
			"url": "https://anypoint.mulesoft.com/apimanager/api/v1/organizations/" + anypointInfo.orgId +
				"/environments/" + anypointInfo.targetEnvId + "/apis",
			"body": JSON.stringify(
				{"promote":{
    				"originApiId": apiId,
    				"policies":{"allEntities": true},
    				"tiers":{"allEntities": true},
    				"alerts":{"allEntities": true}
    			}})
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
			    var jsonBody = JSON.parse(body);
			    console.dir("Promoted Autodiscovery instance name: " + jsonBody.autodiscoveryInstanceName);
				resolve({"apiAssetId": jsonBody.assetId, 
					"apiVersion": jsonBody.autodiscoveryInstanceName, 
					"productVersion": jsonBody.productVersion,
					"apiInstanceId": jsonBody.id,
					"originApiInstanceId": apiId});
		    }

		});

	});

}

module.exports.promoteApis 						= promoteApis;