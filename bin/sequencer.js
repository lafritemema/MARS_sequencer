"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = __importStar(require("amqplib"));
const stream_1 = require("stream");
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("config"));
let proxyHost;
let proxyPort;
let bpHost;
let bpPort;
let rabbitMqUrl;
let exchange;
const cmdTopic = 'action.cmd';
const proxyAlertTopic = 'proxy.alert';
const allBuildPTopic = 'buildp.all';
const reportBuildPTopic = 'buildp.report';
try {
    proxyHost = config_1.default.get('enipProxy.hostname');
    proxyPort = config_1.default.get('enipProxy.port');
    bpHost = config_1.default.get('buildProcessor.hostname');
    bpPort = config_1.default.get('buildProcessor.port');
    rabbitMqUrl = config_1.default.get('rabbitMq.url');
    exchange = config_1.default.get('rabbitMq.exchange');
}
catch (error) {
    console.log('Error on configuration file.');
    console.log(error.message);
    process.exit(1);
}
// amqp stream connection
const stream = amqp.connect(rabbitMqUrl);
const eventManager = new stream_1.EventEmitter();
// const available = true;
// stream definition
stream
    .then((connection) => {
    // channel creation
    return connection.createChannel();
})
    .then((channel) => {
    // when channel create
    // define assertion on exchange node in topic mode (not durable message)
    channel.assertExchange(exchange, 'topic', {
        durable: false,
    });
    // define assertion on non define queue
    channel.assertQueue('', {
        exclusive: true,
    })
        .then((queue) => {
        console.log('wait cmd message');
        // bind messages on for action.cmd topic
        // action.cmd topic is for transmit data include parameters for
        // buildProcessor request
        channel.bindQueue(queue.queue, exchange, cmdTopic);
        channel.bindQueue(queue.queue, exchange, proxyAlertTopic);
        // handler for message reception on action.cmd topic
        channel.consume(queue.queue, processActionCmdMessage, { noAck: true });
    }).catch((error) => {
        console.log(error);
    });
    // handler for eventmanager buildp.all event
    eventManager.on(allBuildPTopic, (data) => {
        console.log('publish data');
        // create a buffer containing data
        const dataBuffer = Buffer.from(JSON.stringify(data));
        // publish the message on buildp.all topic
        // buildp.all topic is for transmit information about build process
        // to IHM
        channel.publish(exchange, allBuildPTopic, dataBuffer);
    });
    eventManager.on(reportBuildPTopic, (report) => {
        const dataBuffer = Buffer.from(JSON.stringify(report));
        channel.publish(exchange, reportBuildPTopic, dataBuffer);
    });
})
    .catch((error) => {
    console.log(error);
});
/**
 * processing for message receive on action.cmd topic
 * => send a request to build processor
 * @param {ConsumeMessage} msg message received on topic
 */
function processActionCmdMessage(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        if (msg) {
            if (msg.fields.routingKey) {
                switch (msg.fields.routingKey) {
                    case cmdTopic:
                        const body = msg.content.toString();
                        try {
                            const bpResponse = yield axios_1.default.request({
                                method: 'get',
                                url: `http://${bpHost}:${bpPort}/sequence/move`,
                                data: body,
                                headers: {
                                    'Content-type': 'application/json',
                                },
                            });
                            // @ts-ignore
                            const bpData = bpResponse.data;
                            if (bpData.status == 'SUCCESS') {
                                // emit an event buildp.all with data.tree (for IHM)
                                eventManager.emit(allBuildPTopic, bpData.tree);
                                try {
                                    const status = yield runSequence(bpData.sequence);
                                    console.log('FIN : ' + status);
                                }
                                catch (error) {
                                    console.log('FIN: ' + error);
                                }
                            }
                            else {
                                console.log(bpResponse);
                            }
                        }
                        catch (bpResponse) {
                            // @ts-ignore
                            const bpData = bpResponse.data;
                            if (bpData.error) {
                                console.log(bpData.error);
                            }
                            else {
                                console.log(bpData);
                            }
                        }
                        break;
                    case proxyAlertTopic:
                        // TODO wait method
                        console.log(proxyAlertTopic);
                        // const proxyMsg = <ProxyPacket>JSON.parse(msg.content.toString());
                        const proxyMsg = { status: 'SUCCESS' };
                        eventManager.emit(proxyAlertTopic, proxyMsg);
                        break;
                    default:
                        console.log(msg);
                }
            }
        }
    });
}
/**
 *
 * @param sequence
 */
function runSequence(sequence) {
    return __awaiter(this, void 0, void 0, function* () {
        const stageGen = stageGenerator(sequence);
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    const stageIt = stageGen.next();
                    if (!stageIt.done) {
                        const stage = stageIt.value;
                        console.log('Run sequence : ' + stage.description);
                        // eslint-disable-next-line max-len
                        const status = yield runSubSequence(stage.requestSequence);
                        console.log(status);
                        eventManager.emit(reportBuildPTopic, {
                            id: stage.id,
                            status: 'SUCCESS',
                        });
                    }
                    else {
                        resolve(true);
                        break;
                    }
                }
                catch (error) {
                    reject(error);
                    break;
                }
            }
        }));
    });
}
/**
 *
 * @param subSequence
 * @returns
 */
function runSubSequence(subSequence) {
    return __awaiter(this, void 0, void 0, function* () {
        const stageReqGen = stageRequestGenerator(subSequence);
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    const srIt = stageReqGen.next();
                    if (!srIt.done) {
                        // eslint-disable-next-line max-len
                        console.log('run subsequence : ' + JSON.stringify(srIt.value));
                        const status = yield runStageRequest(srIt.value);
                        console.log('subrequest : ' + status);
                    }
                    else {
                        resolve(true);
                        break;
                    }
                }
                catch (error) {
                    console.log(error);
                    reject(error);
                    break;
                }
            }
        }));
    });
}
/**
 *
 * @param stageRequest
 */
function runStageRequest(stageRequest) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            switch (stageRequest.action) {
                case 'REQUEST':
                    try {
                        const req = stageRequest.request;
                        const proxyResponse = yield axios_1.default.request({
                            method: req.method,
                            url: req.url,
                            data: req.body,
                            headers: {
                                'Content-type': 'application/json',
                            },
                        });
                        // @ts-ignore
                        const proxyData = proxyResponse.data;
                        if (proxyData.status) {
                            resolve(proxyData.status);
                        }
                        else {
                            reject(proxyData);
                        }
                    }
                    catch (proxyResponse) {
                        // @ts-ignore
                        const proxyData = proxyResponse.data;
                        if (proxyData.error) {
                            reject(proxyData === null || proxyData === void 0 ? void 0 : proxyData.error);
                        }
                        else {
                            reject(proxyData);
                        }
                    }
                    break;
                case 'WAIT':
                    console.log('wait');
                    eventManager.once(proxyAlertTopic, (alertMsg) => {
                        // eslint-disable-next-line max-len
                        console.log(alertMsg);
                        if (alertMsg.status == 'SUCCESS') {
                            resolve(alertMsg.status);
                        }
                        else {
                            reject(alertMsg.error);
                        }
                    });
                    break;
                default:
                    console.log('default');
            }
        }));
    });
}
/**
 * @param sequence
 * @return
 */
function* stageGenerator(sequence) {
    let index = 0;
    while (index < sequence.length) {
        yield sequence[index];
        index++;
    }
}
/**
 *
 * @param reqStage
 */
function* stageRequestGenerator(reqStage) {
    let index = 0;
    while (index < reqStage.length) {
        // get the next stage
        const reqObj = reqStage[index];
        // get the stage definition
        const reqDef = reqObj.definition;
        // if query parameters, generate the url string
        const querystr = reqDef.query ?
            concatQueryParameter(reqDef.query) :
            '';
        const url = `http://${proxyHost}:${proxyPort}${reqDef.api}${querystr}`;
        // init the stage request packet
        const srpacket = {
            action: reqObj.action,
            description: reqObj.description,
        };
        // if action is request
        if (reqObj.action == 'REQUEST') {
            // define a reqInit object with method and headers
            const reqSet = {
                url: url,
                method: reqDef.method,
            };
            // add a body on reqInit if exist
            if (reqDef.body)
                reqSet.body = reqDef.body;
            // add the request definition in the stage request packet
            srpacket.request = reqSet;
        }
        // yield the stage request packet
        yield srpacket;
        index++;
    }
}
/**
 * transform query parameter object to string
 * @param {object} queryObj query parameter object
 * @return {string} string under query parameter format
 */
function concatQueryParameter(queryObj) {
    // empty string list
    const queryList = [];
    // eslint-disable-next-line guard-for-in
    for (const k in queryObj) {
        // push str key=value in list
        // @ts-ignore
        queryList.push(k + '=' + queryObj[k]);
    }
    // return string with all key=value with & separator
    return '?' + queryList.join('&');
}