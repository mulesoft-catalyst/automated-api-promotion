const yaml = require('js-yaml');
const fs = require('fs');
const Arm = require('./arm_api_wrapper');

const CONFIG_FILE = "config/promotion_config.yml";
const TYPE_SERVER_CONST = "SERVER";
const TYPE_CLUSTER_CONST = "CLUSTER";

const SOURCE_ENV_ID = "SOURCE_ENV_ID";
const TARGET_ENV_ID = "TARGET_ENV_ID";

const APP_ONLY_PARAM = "app-only";

function loadConfiguration() {
	try {
    	const config = yaml.safeLoad(fs.readFileSync(CONFIG_FILE, 'utf8'));
    	const indentedJson = JSON.stringify(config, null, 4);
    	console.log(indentedJson);
    	return JSON.parse(indentedJson);
	} catch (e) {
    	console.log("Problem to load configuration file: " + e);
    	process.exit(-1);
	}
}

/*
 * Build array of promises used to obtain source runtime ID and target runtime ID
 */
function definePromisesToGetTargetAndSourceRuntime(token, orgId, 
	targetType, targetName, targetId, sourceType, sourcneName, sourceId) {

    var promiseArray = [];
    if(targetType == TYPE_SERVER_CONST && sourceType == TYPE_SERVER_CONST) {
    	promiseArray = [Arm.getServer(token, orgId, targetId, targetName), Arm.getServer(token, orgId, sourceId, sourcneName)];
    } else if(targetType == TYPE_CLUSTER_CONST && sourceType == TYPE_CLUSTER_CONST) {
    	promiseArray = [Arm.getCluster(token, orgId, targetId, targetName), Arm.getCluster(token, orgId, sourceId, sourcneName)];
    } else if (targetType == TYPE_SERVER_CONST && sourceType == TYPE_CLUSTER_CONST) {
    	promiseArray = [Arm.getServer(token, orgId, targetId, targetName), Arm.getCluster(token, orgId, sourceId, sourcneName)];
    } else if(targetType == TYPE_CLUSTER_CONST && sourceType == TYPE_SERVER_CONST) {
    	promiseArray = [Arm.getCluster(token, orgId, targetId, targetName), Arm.getServer(token, orgId, sourceId, sourcneName)];
	} else {
	    console.log("Error: Unsupported target or source type provided!");
    	process.exit(-1);
    }

    return promiseArray;
}

/*
 * Validate input argument and return its value
 */
function getArgument() {
    if (process.argv.length <= 2) {
        return null;
    }
 
    var param = process.argv[2];

    if(param != APP_ONLY_PARAM) {
        console.log("Invalid argument: " +
            "please pass one of the valid arugments: \'%s\'", APP_ONLY_PARAM);
        process.exit(-1);
    }

    return param;
}

/*
 * Functionality exported by this module
 */
module.exports.APP_ONLY_PARAM                               = APP_ONLY_PARAM;
module.exports.SOURCE_ENV_ID                                = SOURCE_ENV_ID;
module.exports.TARGET_ENV_ID                                = TARGET_ENV_ID;
module.exports.getArgument                                  = getArgument;
module.exports.loadConfiguration 							= loadConfiguration;
module.exports.definePromisesToGetTargetAndSourceRuntime 	= definePromisesToGetTargetAndSourceRuntime;