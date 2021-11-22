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
const logger_1 = __importDefault(require("./logger"));
const promises_1 = require("fs/promises");
// define a logger
const logger = new logger_1.default();
// log info to inform for service in run
logger.info('Run sequencer service');
// event emitter to handle and emit events between elements
const taskManager = new stream_1.EventEmitter();
// eslint-disable-next-line no-unused-vars
// var to store if sequence is running
let isRunningSequence = false;
let sequenceFile;
let sequenceBuff;
let sequenceObj;
let seqToRun;
let seqMsg;
// define var for configuration
let proxyHost;
let proxyPort;
let bpHost;
let bpPort;
let rabbitMqUrl;
let exchange;
let debug;
// define topics for message exchange
const topics = {
    hmiSequencerRequest: 'hmi.sequencer.request',
    hmiSequencerReport: 'hmi.sequencer.report',
    sequencerRequestHmi: 'sequencer.request.hmi',
    proxyReport: 'proxy.report',
    proxyAlert: 'proxy.alert',
    sequencerReportProcessAll: 'sequencer.report.process.all',
    sequencerReportProcessStatus: 'sequencer.report.process.status',
};
// get the non mandatory config
// get debug messages if exists
if (config_1.default.has('debugMessage')) {
    debug = config_1.default.get('debugMessage');
}
// try to get all mandatory config
try {
    // log try message
    logger.try('Load configuration');
    // get proxy configuration
    proxyHost = config_1.default.get('enipProxy.hostname');
    proxyPort = config_1.default.get('enipProxy.port');
    // get build processor configuration
    bpHost = config_1.default.get('buildProcessor.hostname');
    bpPort = config_1.default.get('buildProcessor.port');
    // get message broker configuration
    rabbitMqUrl = config_1.default.get('rabbitMq.url');
    exchange = config_1.default.get('rabbitMq.exchange');
    // log success message
    logger.success('Load configuration');
}
catch (error) {
    // if one of mandatory configuration is missing
    // raise an error
    logger.failure('Load configuration');
    logger.error('Error on configuration file : ' + error.message);
    // log a debug message if exist
    if (debug && ('configuration' in debug)) {
        logger.debug(debug['configuration']);
    }
    // and quit the process
    process.exit(1);
}
/*
// define topics for amqp com via rabbitmq
const actionCmdTopic = 'action.cmd';
const actionToUserTopic = 'action.touser';
const actionToSeqTopic = 'action.toseq';
const proxyAlertTopic = 'proxy.alert';
const allBuildPTopic = 'buildp.all';
const reportBuildPTopic = 'buildp.report';
*/
// -----------------------------------------------
// message broker connection and configuration
// (rabbitMq server)
// -----------------------------------------------
// log a try message
logger.try('Connection to RabbitMQ Server');
// and try a connection
const msgBroker = amqp.connect(rabbitMqUrl);
// initialize and configure amqp communication
msgBroker
    .then((connection) => {
    // connection OK, log a success message
    logger.success('Connection to RabbitMQ Server');
    // channel creation
    return connection.createChannel();
})
    .then((channel) => {
    logger.try('Configure AMQP communications');
    // when channel create
    // define assertion on exchange node in topic mode (not durable message)
    channel.assertExchange(exchange, 'topic', {
        durable: false,
    });
    // define assertion on non define queue
    channel.assertQueue('', {
        exclusive: true,
    }).then((queue) => {
        // publish/subscribe configuration
        // subscribe configuration
        // HMI messages
        // hmiSequencerRequest to listen hmi request message
        channel.bindQueue(queue.queue, exchange, topics.hmiSequencerRequest);
        // action.toseq topic for ihm action message
        channel.bindQueue(queue.queue, exchange, topics.hmiSequencerReport);
        // PROXY messages
        // proxy.alert topic for proxy alert message
        channel.bindQueue(queue.queue, exchange, topics.proxyAlert);
        // define a handler to consume messages for the previous topics
        channel.consume(queue.queue, consumeRabbitMqMessage, { noAck: true });
        logger.success('Configure AMQP communications');
        logger.info('Sequencer service ready');
        logger.info('Wait for IHM command message');
    }).catch((error) => {
        logger.failure('Configure AMQP communications');
        logger.error(error.message);
        process.exit(1);
    });
    // handler for taskManager sequencerReportProcessAll
    // publish a message on sequencer.report.process.all topic
    taskManager.on(topics.sequencerReportProcessAll, (processTree) => {
        // create a buffer containing data
        const dataBuffer = Buffer.from(JSON.stringify(processTree));
        logger.info('Publish report for all process on the message broker');
        channel.publish(exchange, topics.sequencerReportProcessAll, dataBuffer);
    });
    // handler for taskManager sequencerReportProcessStatus
    // publish a message on sequencer.report.process.status topic
    taskManager.on(topics.sequencerReportProcessStatus, (report) => {
        const dataBuffer = Buffer.from(JSON.stringify(report));
        // eslint-disable-next-line max-len
        logger.info('Publish report for stage status on the message broker');
        channel.publish(exchange, topics.sequencerReportProcessStatus, dataBuffer);
    });
    // handler for taskmanager sequencer.request.hmi
    taskManager.on(topics.sequencerRequestHmi, (data) => {
        const dataBuffer = Buffer.from(JSON.stringify(data));
        channel.publish(exchange, topics.sequencerRequestHmi, dataBuffer);
    });
})
    .catch((error) => {
    logger.failure('Connection to RabbitMQ Server');
    logger.error(error.message);
    if (debug && ('rabbitMQ' in debug)) {
        logger.debug(debug['rabbitMQ']);
    }
    process.exit(1);
});
/**
 * processing for message receive on action.cmd topic
 * => send a request to build processor
 * @param {ConsumeMessage} msg message received on topic
 */
function consumeRabbitMqMessage(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        if (msg) {
            if (msg.fields.routingKey) {
                switch (msg.fields.routingKey) {
                    case topics.hmiSequencerRequest: // if message on hmi.sequencer.request
                        if (!isRunningSequence) { // if no sequence already running
                            logger.info('Command received from IHM to run sequence');
                            try {
                                logger.try('Get sequence from the build processor service');
                                // convert the rabbitMq message content buffer -> string
                                // for first release: read request settings from config file
                                // eslint-disable-next-line max-len
                                sequenceFile = yield (0, promises_1.open)('./config/sequence.json', 'r');
                                sequenceBuff = yield sequenceFile.readFile();
                                sequenceObj = JSON.parse(sequenceBuff.toString());
                                seqToRun = sequenceObj.sequenceToRun;
                                seqMsg = sequenceObj[seqToRun].seqMsg;
                                // const hmiSeqMsg = msg.content.toString();
                                // get the build process
                                // eslint-disable-next-line max-len
                                const buildpResponse = yield getBuildProcess(JSON.stringify(seqMsg));
                                logger.success('Get sequence from the build processor service');
                                // report all the process tree via taskManager
                                taskManager.emit(topics.sequencerReportProcessAll, buildpResponse.processTree);
                                // run the sequence
                                logger.try('Run the sequence');
                                isRunningSequence = true;
                                // eslint-disable-next-line max-len
                                const status = yield runSequence(buildpResponse.sequence);
                                if (status.status == 'SUCCESS') {
                                    logger.success('End of sequence');
                                    isRunningSequence = false;
                                }
                                else {
                                    logger.failure('End of sequence');
                                    isRunningSequence = false;
                                }
                                // TODO reaction after sequence good running
                            }
                            catch (error) {
                                // TODO handle error
                                logger.failure('End of sequence');
                                // eslint-disable-next-line max-len
                                logger.error('Error during the sequence execution\n' + error.message);
                                isRunningSequence = true;
                            }
                        }
                        else {
                            // eslint-disable-next-line max-len
                            logger.warn('Request for a new sequence received but sequencer already running.\nRequest ignored');
                        }
                        break;
                    case topics.proxyAlert:
                        // if message on proxy.alert topic
                        // parse the message
                        const proxyAlert = JSON.parse(msg.content.toString());
                        // log info
                        // eslint-disable-next-line max-len
                        logger.info(`Alert message from proxy => type : ${proxyAlert.type}; status : ${proxyAlert.status}`);
                        // transmit the message via taskManager
                        taskManager.emit(topics.proxyAlert, proxyAlert);
                        break;
                    case topics.hmiSequencerReport:
                        const hmiReport = { status: 'SUCCESS' };
                        taskManager.emit(topics.hmiSequencerReport, hmiReport);
                        break;
                    default:
                        // eslint-disable-next-line max-len
                        logger.warn('Sequencer listen on topic but no processing is configured');
                }
            }
        }
    });
}
/**
 * function to get the build process
 * it send a request to the build processor service
 * @param {string} requestBody request body
 * @return {BuildProcessorResponse} an object describing
 * the build processor response
 */
function getBuildProcess(requestBody) {
    return __awaiter(this, void 0, void 0, function* () {
        // try to get build process
        try {
            const bpResponse = yield axios_1.default.request({
                method: 'get',
                url: `http://${bpHost}:${bpPort}/sequence/move`,
                data: requestBody,
                headers: {
                    'Content-type': 'application/json',
                },
            });
            // get axios request response data
            const bpData = bpResponse.data;
            if (bpData.status == 'SUCCESS') {
                // if packet with status SUCCESS return from buildprocessor
                // log a succes message
                logger.success('Get sequence using the build processor service');
                // return the buildProcessor Service response
                return bpData;
            }
            else {
                // raise an error with message return by buildprocessor service
                throw new Error(bpData.error);
            }
            /*
            // check if request status is success
            if (bpData.status == 'SUCCESS') {
              logger.success('Send request to build processor');
              // emit an event buildp.all with data.tree (for IHM)
              eventManager.emit(allBuildPTopic, bpData.tree);
              try {
                isRunningSequence = true;
                const status = await runSequence(<Stage[]>bpData.sequence);
                console.log('FIN : '+ status);
                isRunningSequence = false;
              } catch (error) {
                console.log('FIN: '+ error);
              }
            } else {
              console.log(bpResponse);
            }*/
        }
        catch (error) {
            // if error occured during the axios request
            // raise the error
            throw error;
            /*
            // @ts-ignore
            logger.failure('Send request to build processor');
            logger.error('Build processor service unreachable');
            logger.error((<Error>error).message);
        
            if (resolution && ('buildProcessor' in resolution)) {
              logger.resolution(resolution['buildProcessor']);
            }
        
            logger.warn('Sequence aborted');
            logger.info('Wait for new IHM command message');
            */
        }
    });
}
/**
 * function to run the sequence
 * @param {Stage[]} sequence
 */
function runSequence(sequence) {
    return __awaiter(this, void 0, void 0, function* () {
        // define a generator to iterate in the stage list
        const stageGen = stageGenerator(sequence);
        // and return a promise runing the sequence
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            // report the sequence execution begin
            taskManager.emit(topics.sequencerReportProcessStatus, {
                id: 'begin',
                status: 'SUCCESS',
            });
            while (true) {
                try {
                    // get the next iteration
                    const stageIt = stageGen.next();
                    // if not the end of generator
                    if (!stageIt.done) {
                        // get the iteration content
                        const stage = stageIt.value;
                        logger.info(`Run stage : ${stage.description}`);
                        // eslint-disable-next-line max-len
                        // run the subsequence for the stage
                        const status = yield runSubSequence(stage.requestSequence, stage.id);
                        // check the subsequence status
                        if (status.status == 'SUCCESS') {
                            // if success log a success message
                            logger.success(`Stage ${stage.description}`);
                        }
                        else {
                            // log a failure message
                            logger.failure(`Stage ${stage.description}`);
                            // and raise an error
                            throw new Error(status.error);
                        }
                        // report the stage execution status
                        taskManager.emit(topics.sequencerReportProcessStatus, status);
                    }
                    else {
                        // if end of generator with no error
                        // report the sequence end with success
                        taskManager.emit(topics.sequencerReportProcessStatus, {
                            id: 'end',
                            status: 'SUCCESS',
                        });
                        // resolve the promise with success status
                        resolve({
                            status: 'SUCCESS',
                        });
                        break;
                    }
                }
                catch (error) {
                    // if error during sequence
                    // report the sequence end with error
                    taskManager.emit(topics.sequencerReportProcessStatus, {
                        id: 'end',
                        status: 'ERROR',
                        error: error.message,
                    });
                    // reject the promise with the error
                    reject(error);
                    break;
                }
            }
        }));
    });
}
/**
 * function to run stage actions
 * @param {Action[]} actionSequence list of actions
 * @param {string} stageId id of stage
 * @return {Promise} a promise to execute the actions
 */
function runSubSequence(actionSequence, stageId) {
    return __awaiter(this, void 0, void 0, function* () {
        // define a generator to iterate in the action list
        const stageActionGen = actionRequestGenerator(actionSequence, stageId);
        // and return a promise running the subsequence
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    // get the next iteration
                    const actionIteration = stageActionGen.next();
                    // if not the end of generator
                    if (!actionIteration.done) {
                        // get the iteration content
                        const actionRequest = actionIteration.value;
                        // run the action
                        // eslint-disable-next-line max-len
                        logger.info(`|-- Run action ${actionRequest.type} : ${actionRequest.description}`);
                        // if not definition == undefined run the action
                        if (actionRequest.definition) {
                            // eslint-disable-next-line max-len
                            let status; // await runStageAction(actionRequest.definition);
                            switch (actionRequest.type) {
                                case 'REQUEST.PROXY':
                                    // eslint-disable-next-line max-len
                                    status = yield requestToProxy(actionRequest.definition);
                                    break;
                                case 'WAIT.PROXY':
                                    status = yield waitForProxy();
                                    break;
                                case 'REQUEST.HMI':
                                    status = requestToHmi(actionRequest.definition);
                                    break;
                                case 'WAIT.HMI':
                                    status = yield waitForHmi();
                                    break;
                                default:
                                    status = 'ERROR';
                                    break;
                            }
                            if (status != 'SUCCESS') {
                                // eslint-disable-next-line max-len
                                throw new Error(`Error during action ${actionRequest.description}`);
                            }
                        }
                        else {
                            // log a warning message
                            // eslint-disable-next-line max-len
                            logger.warn(`Run action ${actionRequest.type} : type not valid or not implemented yet.`);
                            // and raise an error for invalid action
                            // eslint-disable-next-line max-len
                            throw new Error(`Invalid action ${actionRequest.type} in subsequence for stage ${stageId}`);
                        }
                    }
                    else {
                        // if generator end return an SUCCESS message.
                        resolve({
                            id: stageId,
                            status: 'SUCCESS',
                        });
                        break;
                    }
                }
                catch (error) {
                    // if error, return an error packet
                    reject(error);
                    break;
                }
            }
        }));
    });
}
/**
 * function to send a request to the proxy
 * @param {AxiosRequestConfig} axiosRequest request parameter under
 * AxiosRequestConfig format
 * @return {Promise<string>} a promise sending a request to the proxy
 */
function requestToProxy(axiosRequest) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            // send request to proxy using axios
            const proxyResponse = yield axios_1.default
                .request(axiosRequest);
            // get data from axios answer
            const proxyData = proxyResponse.data;
            // if proxy response status is SUCCESS
            if (proxyData.status == 'SUCCESS') {
                // resolve the Promise
                resolve('SUCCESS');
            }
            else {
                // raise an error with error message
                reject(new Error(proxyData === null || proxyData === void 0 ? void 0 : proxyData.error));
            }
        }
        catch (proxyResponse) {
            // @ts-ignore
            const proxyData = proxyResponse.data;
            if (proxyData.error) {
                reject(new Error(proxyData === null || proxyData === void 0 ? void 0 : proxyData.error));
            }
            else {
                reject(proxyData);
            }
        }
    }));
}
/**
 * function to run a wait for proxy action
 * @return {Promise<string>} promise to wait for proxy reponse
 */
function waitForProxy() {
    return new Promise((resolve, reject) => {
        taskManager.once(topics.proxyAlert, (alertMsg) => {
            // eslint-disable-next-line max-len
            if (alertMsg.status == 'SUCCESS') {
                resolve('SUCCESS');
            }
            else {
                reject(new Error(alertMsg.error));
            }
        });
    });
}
/**
 * function to send request to hmi
 * @param {HMIRequest} hmiRequest object describing a HMI request
 * @return {string} success message
 */
function requestToHmi(hmiRequest) {
    taskManager.emit(topics.sequencerRequestHmi, hmiRequest);
    return 'SUCCESS';
}
/**
 * function to run wait for HMI
 * @return {Promise<string>} promise to wait for hmi
 */
function waitForHmi() {
    return new Promise((resolve, reject) => {
        taskManager.once(topics.hmiSequencerReport, (hmiMsg) => {
            // TODO : implement other message
            resolve('SUCCESS');
        });
    });
}
/**
 *
 * @param stageRequest

async function runStageAction(
    actionDefinition:AxiosRequestConfig<any>| HMIRequest
    ):Promise<string> {
  return new Promise(async (resolve, reject)=>{
    switch (actionRequest.type) {
      case 'REQUEST.PROXY':
        try {
          // get axiosConfig from actionRequest
          const axiosReqPara = <AxiosRequestConfig>actionRequest.definition;
          // send request
          const proxyResponse = await axios
              .request<ProxyResponse>(axiosReqPara);

          // get data from axio answer
          const proxyData = proxyResponse.data;

          // process result
          if (proxyData.status) {
            resolve(proxyData.status);
          } else {
            reject(proxyData);
          }
        } catch (proxyResponse) {
          // @ts-ignore
          const proxyData = proxyResponse.data;
          if (proxyData.error) {
            reject(proxyData?.error);
          } else {
            reject(proxyData);
          }
        }
        break;
      case 'WAIT.PROXY':
        eventManager.once(proxyAlertTopic, (alertMsg:ProxyResponse)=>{
          // eslint-disable-next-line max-len
          console.log(alertMsg);
          if (alertMsg.status == 'SUCCESS') {
            resolve(alertMsg.status);
          } else {
            reject(alertMsg.error);
          }
        });
        break;
      case 'REQUEST.HMI':
        const hmiReqDef = <HMIRequest>actionRequest.definition;
        eventManager.emit(actionToUserTopic, hmiReqDef);
        resolve('SUCCESS');
        break;
      case 'WAIT.HMI':
        eventManager.once(actionToSeqTopic, (hmiMsg:HMIRequest)=>{
          resolve(hmiMsg.description);
        });
        break;
      default:
        console.log('default');
        reject('error');
    }
  });
}
*/
/**
 * stage generator
 * @param {Stage[]} sequence
 */
function* stageGenerator(sequence) {
    let index = 0;
    while (index < sequence.length) {
        yield sequence[index];
        index++;
    }
}
/**
 * generate an iterator of Action request from a list of Action
 * @param {Action[]} reqStage list of action
 * @param {string} stageId id of stage
 */
function* actionRequestGenerator(reqStage, stageId) {
    let index = 0;
    while (index < reqStage.length) {
        // get the next stage
        const reqObj = reqStage[index];
        let definition;
        const atype = `${reqObj.action}.${reqObj.target}`;
        switch (atype) {
            case 'REQUEST.PROXY':
                const pdef = reqObj.definition;
                const querystr = pdef.query ?
                    concatQueryParameter(pdef.query) :
                    '';
                const url = `http://${proxyHost}:${proxyPort}${pdef.api}${querystr}`;
                definition = {
                    method: pdef.method,
                    data: pdef.body,
                    headers: {
                        'Content-type': 'application/json',
                    },
                    url: url,
                };
                break;
            case 'REQUEST.HMI':
                const hmiDef = reqObj.definition;
                definition = {
                    id: stageId,
                    message: hmiDef.message,
                    description: reqObj.description,
                };
                break;
            case 'WAIT.PROXY':
                definition = {};
                break;
            case 'WAIT.HMI':
                definition = {};
                break;
            default:
                definition = undefined;
        }
        // @ts-ignore
        const actionRequest = {
            stageId: stageId,
            type: atype,
            definition: definition,
            description: reqObj.description,
        };
        // yield the stage request packet
        yield actionRequest;
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
