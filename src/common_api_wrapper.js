// Anypoint API Wrapper
// Implements API calls required to authenticate and get basic information like 
// Organisation ID, Environments IDs, etc.

const Req = require("request");
const Utility = require('./utility');

var anypointInfo = {
    token:"", //token retrieved by authentication
    orgId:"", // organisation ID
    sourceEnvId:"",
    targetEnvId:"",
    runtimeTargetId:"", //deployment target
    runtimeSourceId:"" //deployment source
};

/*
 * Builds the object that contains information returned by platform:
 * token
 * organisation id
 * source environment id
 * target environment id
 * target runtime id
 * source runtime id
 */
function getAnypointInfo(targetEnvName, sourceEnvName, sourceType, sourceName, targetType, targetName, organisationName) {

	return new Promise(function(resolve, reject) {

		login()
		.then((resToken) => {
			anypointInfo.token = resToken;
			return getOrgId(resToken, organisationName);
		})
		.then((resOrgId) => {
			anypointInfo.orgId = resOrgId; //save for use by other calls
			return getEnvironments(anypointInfo.token, resOrgId, targetEnvName, sourceEnvName);
		})
		.then((envs) => {
			anypointInfo.sourceEnvId = envs[0][Utility.SOURCE_ENV_ID]; //save for use by other calls
			anypointInfo.targetEnvId = envs[1][Utility.TARGET_ENV_ID]; //save for use by other calls
			var promiseArray = Utility.definePromisesToGetTargetAndSourceRuntime(anypointInfo.token, anypointInfo.orgId, 
				targetType, targetName, anypointInfo.targetEnvId, sourceType, sourceName, anypointInfo.sourceEnvId);

			return Promise.all(promiseArray);
		})
		.then(([runtimeTargetId, runtimeSourceId]) => {
	    		console.log("Runtime Source ID: " + runtimeSourceId + "\nRuntime Target ID: " + runtimeTargetId);
	    		anypointInfo.runtimeTargetId = runtimeTargetId;
	    		anypointInfo.runtimeSourceId = runtimeSourceId;
	    		resolve(anypointInfo);
		})
		.catch(err => {
			console.log("Error: " + err);
			reject(error);
		});

	});
}

/*
 * Login and return token.
 * Anypoint credentials must be stored as environment variables.
 */
function login() {
	return new Promise(function(resolve, reject) {
		Req.post({
		    "headers": { "content-type": "application/json" },
		    "url": "https://anypoint.mulesoft.com/accounts/login",
		    "body": JSON.stringify({
		        "username": process.env.ANYPOINT_USER,
		        "password": process.env.ANYPOINT_PASSWORD
		    })
		}, (error, response, body) => {
			if(error) {
				reject(error);
			} else {
				jsonBody = JSON.parse(body);

			    var token = jsonBody.token_type + " " + jsonBody.access_token;
			    console.log('Token has been retrieved: ' + token);
			    resolve(token);
			}

		});
	});
}

/*
 * Get Anypoint Organisation ID
 */
function getOrgId(token, organisationName) {
	return new Promise(function(resolve, reject) {
		Req.get({
			"headers": {"Authorization": token}, 
			"url": "https://anypoint.mulesoft.com/accounts/api/me"
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
		    	jsonBody = JSON.parse(body);
		    	var org = jsonBody.user.memberOfOrganizations.find(function(org) {
		  			return org.name == organisationName;
				});
		    	console.log('Organization ID has been retrieved: ' + org.id);
		    	resolve(org.id);
		    }
		});
	});
}

/*
 * Returns IDs of required environments
 */
function getEnvironments(token, orgId, targetEnvName, sourceEnvName) {
	return new Promise(function(resolve, reject) {
		Req.get({
			"headers": {"Authorization": token}, 
			"url": "https://anypoint.mulesoft.com/accounts/api/organizations/"+orgId+"/environments"
		}, (error, response, body) => {
		    if(error) {
		    	reject(error);
		    } else {
			    jsonBody = JSON.parse(body);

			    var target = jsonBody.data.find(function(item) {
		  			return item.name == targetEnvName;
				});
				var source = jsonBody.data.find(function(item) {
		  			return item.name == sourceEnvName;
				});
					 
			    console.log('Source environment ID: ' + source.id + '\nTarget environment ID: ' + target.id);
			    var envs = [];
			    envs.push({[Utility.SOURCE_ENV_ID] : source.id});
			    envs.push({[Utility.TARGET_ENV_ID] : target.id});
			    resolve(envs);
		    }
		});
	});
}

module.exports.getAnypointInfo 		= getAnypointInfo;