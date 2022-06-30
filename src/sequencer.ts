import {getConfigFromYaml} from '@common/utils';
import Logger from '@common/logger';
import {AMQPServer} from './server/amqp';
import {
  ServerConfiguration,
  ConsumerPacket,
  MessageQuery,
  MessageHeaders,
  MessageBody,
  RequestDefinition} from './server/interfaces';
import {
  Action,
  BuildProcessReport,
  RequestConfiguration as BPRequestConfiguration,
  RequestDefinition as BPRequestDefinition} from './services/build_processor/interfaces';
import {CommandGenReport,
  Command,
  WaitDefinition} from './services/command_generator/interfaces';
import {buildBodyFromAction} from './services/command_generator';
import {EventEmitter} from 'stream';
import axios, {AxiosRequestConfig} from 'axios';
import {AssetReportBody} from './services/assets/interfaces';
import { cp } from 'fs';


// eslint-disable-next-line no-unused-vars
const enum TOPIC {
  // eslint-disable-next-line no-unused-vars
  SEQUENCER_RUN_REQUEST = 'request.sequencer.run',
  // eslint-disable-next-line no-unused-vars
  BUILD_PROCESSOR_REQUEST = 'request.build_processor',
  // eslint-disable-next-line no-unused-vars
  BUILD_PROCESSOR_REPORT = 'report.sequencer.build_processor',
  // eslint-disable-next-line no-unused-vars
  CMD_GENERATOR_REPORT = 'report.sequencer.command_generator',
  // eslint-disable-next-line no-unused-vars
  HMI_REPORT = 'report.sequencer.hmi',
  // eslint-disable-next-line no-unused-vars
  HMI_REQUEST = 'request.hmi',
  // eslint-disable-next-line no-unused-vars
  REPORT_TO_HMI = 'report.hmi',
  // eslint-disable-next-line no-unused-vars
  COMMAND_GENERATOR_REQUEST = 'request.command_generator',
  // eslint-disable-next-line no-unused-vars
  PROXY_REQUEST = 'request.proxy',
  // eslint-disable-next-line no-unused-vars
  PROXY_REPORT = 'report.sequencer.proxy'
}

// eslint-disable-next-line no-unused-vars
const enum PATH {
  // eslint-disable-next-line no-unused-vars
  HMI_BP_ALL = '/buildProcess/all',
  // eslint-disable-next-line no-unused-vars
  HMI_BP_STATUS = '/buildProcess/status',
  // eslint-disable-next-line no-unused-vars
  CMDGEN_CMD_GENERATE = '/commands/generate',
}

// eslint-disable-next-line no-unused-vars
const enum PROTOCOL {
  // eslint-disable-next-line no-unused-vars
  AMQP = 'amqp',
  // eslint-disable-next-line no-unused-vars
  HTTP = 'http',
}

// eslint-disable-next-line no-unused-vars
enum ASSET {
  // eslint-disable-next-line no-unused-vars
  PROXY = 'PROXY',
  // eslint-disable-next-line no-unused-vars
  HMI = 'HMI'
}


const LOGGER = new Logger('SEQUENCER');
let amqpServer:AMQPServer;
const sequenceRuning = false;
const SEQUENCECONFIG = './config/sequence.yaml';
const POSTMAN = new EventEmitter();
let comProtocol:PROTOCOL;


LOGGER.try('get server config');
getConfigFromYaml<ServerConfiguration>('./config/server.yaml')
    .then((serverConf:ServerConfiguration)=> {
      LOGGER.success('get server config');
      // const httpConf = serverConf.http;
      const amqpConf = serverConf.amqp;

      LOGGER.info('build amqp server from config');
      if (amqpConf && amqpConf.activate) {
        comProtocol = PROTOCOL.AMQP;

        amqpServer = new AMQPServer('sequencer',
            amqpConf.host,
            amqpConf.port,
            amqpConf.exchange);

        amqpServer
            .addQueue('sequencer.com')
            // add a consumer to process a run request (ask for new sequence)
            .addConsumer(TOPIC.SEQUENCER_RUN_REQUEST,
                sendRequestToBuildProcessor)
            // add a consumer to send the all the build process to the hmi
            .addConsumer(TOPIC.BUILD_PROCESSOR_REPORT,
                sendBuildProcessToHmi)
            // add a consumer to process the commands send by the command generator
            .addConsumer(TOPIC.CMD_GENERATOR_REPORT,
                processCmdGenReport)
            // add a consumer to process the list of actions send by build processor
            .addConsumer(TOPIC.BUILD_PROCESSOR_REPORT,
                runBuildProcess)
            .addConsumer(TOPIC.PROXY_REPORT,
                processProxyReport)
            .addConsumer(TOPIC.HMI_REPORT,
                processHmiReport);

        LOGGER.info('run server');
        amqpServer.run();
      }
    });


/**
 * fonction to build sequence definition
 * and send rquest to build processor topic
 * @param {ConsumerPacket} cPacket : consumer packet
 */
async function sendRequestToBuildProcessor(cPacket:ConsumerPacket) {
  LOGGER.info('request to run sequence received');
  // check if no sequence already running
  if (!sequenceRuning) {
    // get the config
    LOGGER.try(`get sequence definition from config file ${SEQUENCECONFIG}`);
    const reqConfig = await getConfigFromYaml<BPRequestConfiguration>(SEQUENCECONFIG);
    LOGGER.success(`get sequence definition from config file ${SEQUENCECONFIG}`);

    // get the request def
    const sequenceToRun = reqConfig.sequenceToRun;
    const seqDefinition = reqConfig.definitions[sequenceToRun];

    const cPacket = buildCPacketFromBPReqDef(comProtocol, seqDefinition);

    // publish the message using amqp server
    amqpServer.publish(cPacket);
  } else {
    LOGGER.error('sequence already running, request ignored');
  }
}
/**
 * consumer to send process received from build processor to hmi
 * @param {ConsumerPacket} cPacket : consumer packet
 */
function sendBuildProcessToHmi(cPacket:ConsumerPacket) {
  // no update of body, it already contains build process
  // update the query with hmi report topic and path
  cPacket.query = <MessageQuery>{
    type: 'amqp',
    topic: TOPIC.REPORT_TO_HMI,
    path: PATH.HMI_BP_ALL,
  };

  cPacket.headers = <MessageHeaders>{};

  // publish using the server
  amqpServer.publish(cPacket);
}

/**
 * consumer to run sequence at build process reception
 * @param {ConsumerPacket} cPacket : consumer packet
 */
async function runBuildProcess(cPacket:ConsumerPacket) {
  // get the build process report contains in the body
  const bpReport = <BuildProcessReport>cPacket.body;

  const actions = bpReport.buildProcess;
  LOGGER.info('run build process');

  for (const action of actions) {
    LOGGER.info(`run action ${action.uid} : ${action.description}`);
    const result = await runAction(action);

    if (result == 'ERROR') {
      LOGGER.error(`error during action ${action.uid} : ${action.description}`);
      LOGGER.debug('use the manual robot commands to put the robot in a safe position');
      break;
    }

    const cPacket = buildHMIStatusCPacket(action.uid, result);
    amqpServer.publish(cPacket);
  }
  LOGGER.info('end of process');
}

/**
 * function to run actions
 * @param {Action} action : the action to run
 * @return {Promise<string>}
 */
async function runAction(action:Action):Promise<string> {
  LOGGER.try('request commands to command generator');
  const commands = await getCommandsForAction(action);
  LOGGER.success('request commands to command generator service');

  let actionResultStatus = 'SUCCESS';

  for (const cmd of commands) {
    try {
      LOGGER.debug(`run command ${cmd.description}`);
      const result = await runCommand(cmd);
    } catch (error) {
      LOGGER.failure((`run command ${cmd.description}`));
      actionResultStatus = 'ERROR';
      break;
    }
  }
  return actionResultStatus;
}

/**
 * function to run a command
 * @param {Command} command : command to run
 * @return {Promise<string>}
 */
function runCommand(command:Command):Promise<AssetReportBody> {
  return new Promise((resolve, reject) => {
    switch (command.action) {
      case 'REQUEST':
        // send a request using the current protocol
        // all needed data are stored in the command
        POSTMAN.once(command.uid, (response:AssetReportBody)=>{
          if (response.status == 'SUCCESS') {
            resolve(response);
          } else {
            reject(response);
          }
        });
        sendRequest(comProtocol, command);
      case 'WAIT':
        const waitDef = <WaitDefinition> command.definition;
        POSTMAN.once(waitDef.uid, (response:AssetReportBody)=>{
          if (response.status == 'SUCCESS') {
            resolve(response);
          } else {
            reject(response);
          }
        });
        break;
    }
  });
}


/**
 * function to get commands associated to the build processor action
 * from command generator service
 * @param {action} action : build processor action
 * @return {Promise<Command[]>} : promise returns command when received
 */
function getCommandsForAction(action:Action):Promise<Command[]> {
  return new Promise((resolve, reject)=>{// build the message body
    // build the consumer packet
    const cPacket = buildCPacketFromAction(comProtocol, action);

    // wait a postman event to return a result
    // POSTMAN emit send in the processCmdGenReport
    // use the unique action uid as event name
    POSTMAN.once(action.uid, (commands:Command[])=>{
      resolve(commands);
    });

    // publish using amqpServer
    amqpServer.publish(cPacket);
    // TODO action if commandGen error.
  });
}

/**
 * function to prepare a consumer packet for the server
 * and send the request
 * only amqp yet
 * @param {PROTOCOL} protocol : used protocol (only amqp yet)
 * @param {Command} command : command object containing all infos
 */
function sendRequest(protocol:PROTOCOL, command:Command) {
  // only for amqp yet

  if (command.target == 'HMI') {
    const cPacket = buildCPacketFromReqCommand(comProtocol, command);
    amqpServer.publish(cPacket);
  } else {
    sendHTTPProxyRequest(command);
  }
}


/**
 * fonction to build a consumer packet from a build processor
 * request definition
 * @param {PROTOCOL} protocol : request protocol
 * @param {BPRequestDefinition} seqDefinition : build processor request definition
 * @return {ConsumerPacket} : consumer packet for following consuming fonctions
 */
function buildCPacketFromBPReqDef(
    protocol:PROTOCOL,
    seqDefinition:BPRequestDefinition):ConsumerPacket {
  // build the body with request definition body
  const _body = <MessageBody> seqDefinition.body ? seqDefinition.body : '';

  const _headers = <MessageHeaders>{};
  // build the header (add a report topic)
  if (protocol == 'amqp') {
    _headers['report_topic'] = TOPIC.BUILD_PROCESSOR_REPORT;
  }

  // prepare the query for amqp server
  const _query = <MessageQuery>{
    type: protocol,
    path: seqDefinition.path,
    topic: TOPIC.BUILD_PROCESSOR_REQUEST,
  };

  return <ConsumerPacket>{
    headers: _headers,
    body: _body,
    query: _query,
  };
}

/**
 * fonction to build a consumer packet from an action
 * @param {PROTOCOL} protocol : request protocol
 * @param {Action} action : action
 * @return {ConsumerPacket} : consumer packet for following consuming fonctions
 */
function buildCPacketFromAction(protocol:PROTOCOL,
    action:Action):ConsumerPacket {
  // build the message body
  const cmdgenBody = <MessageBody> buildBodyFromAction(action);

  // build the message query for amqp publish
  const query = <MessageQuery> {
    type: protocol,
    topic: TOPIC.COMMAND_GENERATOR_REQUEST,
    path: PATH.CMDGEN_CMD_GENERATE,
  };

  // build the message headers for amqp publish
  const headers = <MessageHeaders> {
    report_topic: TOPIC.CMD_GENERATOR_REPORT,
  };

  // build the consumer packet
  return <ConsumerPacket> {
    body: cmdgenBody,
    query: query,
    headers: headers,
  };
}

/**
 * function to build a consumer packet from a command
 * @param {PROTOCOL} protocol : request protocol
 * @param {Command} command : the command
 * @return {ConsumerPacket} the consumer packet
 */
function buildCPacketFromReqCommand(protocol:PROTOCOL, command:Command):ConsumerPacket {
  // const {action, definition, description, target, uid} = command;
  const commandDef = <RequestDefinition>command.definition;
  let topic:TOPIC;
  const _headers = <MessageHeaders> {
    uid: command.uid,
  };

  switch (command.target) {
    case 'PROXY':
      topic = TOPIC.PROXY_REQUEST;
      _headers['report_topic'] = TOPIC.PROXY_REPORT;
      break;
    case 'HMI':
      topic = TOPIC.HMI_REQUEST;
      _headers['report_topic'] = TOPIC.HMI_REPORT;
      break;
    default:
      // TODO raise the error
      throw new Error();
  }

  const _body = <MessageBody> commandDef.body ? commandDef.body :'';
  const _query = <MessageQuery> {
    type: protocol,
    path: commandDef.path,
    topic: topic,
  };

  return <ConsumerPacket>{
    headers: _headers,
    query: _query,
    body: _body,
  };
}

/**
 * consumer to process commands received from ommandGenerator
 * @param {ConsumerPacket} cPacket : consumer packet
 * @return {ConsumerPacket} packet for following consumers
 */
function processCmdGenReport(cPacket:ConsumerPacket):ConsumerPacket {
  // get message body
  const commandGenReport = <CommandGenReport> cPacket.body;

  // get action id from message
  const actionId = commandGenReport.uid;

  // emit the message with actionId as name and list of commands as data
  // this message will be recepted by POSTMAN action defined in getCommandsForAction function
  POSTMAN.emit(actionId, commandGenReport.commands);
  return cPacket;
}

/**
 * consuming function to process report from proxy
 * @param {ConsumerPacket} cPacket : consumer packet
 * @return {ConsumerPacket} consumer packet for following consumers
 */
function processProxyReport(cPacket:ConsumerPacket):ConsumerPacket {
  // TODO to define
  // const uid = <string> cPacket.headers.uid;
  // POSTMAN.emit(uid, cPacket.body);
  const _headers = cPacket.headers;
  const _body = cPacket.body;
  POSTMAN.emit(_headers['uid'], _body);
  return cPacket;
}
/**
 * fonction to process report from hmi
 * @param {ConsumerPacket} cPacket : consumer packet
 */
function processHmiReport(cPacket:ConsumerPacket) {
  const headers = cPacket.headers;
  POSTMAN.emit(headers['uid'], <AssetReportBody>cPacket.body);
}

export interface ProxyResponse {
  status:'ERROR'|'SUCCESS',
  data?:object,
  error?:string
}

/**
 * temporary function to test proxy
 * @param {Command} command : command to send
 * @return {Promise<string>}
 */
async function sendHTTPProxyRequest(command:Command) {
  const PROXYHOST = '127.0.0.1';
  const PROXYPORT = 8000;
  const cmdDef = <RequestDefinition> command.definition;

  try {
    let url = `http://${PROXYHOST}:${PROXYPORT}${cmdDef.path}`;
    
    if (cmdDef.query) {
      const queryStr = concatQueryParameter(cmdDef.query);
      url+=queryStr;
    }
    console.log(url);
    const axiosRequest = <AxiosRequestConfig>{
      method: cmdDef.method,
      data: cmdDef.body,
      headers: {
        'Content-type': 'application/json',
        'uid': command.uid,
      },
      url: url,
    };

    // send request to proxy using axios
    const proxyResponse = await axios.request<ProxyResponse>(axiosRequest);

    // get data from axios answer
    const proxyData = proxyResponse.data;
    const cmdId = proxyResponse.headers['uid'];

    POSTMAN.emit(cmdId, proxyData);
  } catch (error) {
    POSTMAN.emit(command.uid,
      <AssetReportBody>{status: 'ERROR', error: error});
  }
}

/**
 * transform query parameter object to string
 * @param {object} queryObj query parameter object
 * @return {string} string under query parameter format
 */
function concatQueryParameter(queryObj:object):string {
  // empty string list
  const queryList:string[] = [];

  // eslint-disable-next-line guard-for-in
  for (const k in queryObj) {
    // push str key=value in list
    // @ts-ignore
    queryList.push(k+'='+queryObj[k]);
  }
  // return string with all key=value with & separator
  return '?'+queryList.join('&');
}

/**
 * fonction to build consumer packet for hmi status report
 * @param {string} uid: action uid
 * @param {string} status : action status ERROR or SUCCESS
 * @return {ConsumerPacket}
 */
function buildHMIStatusCPacket(uid:string, status:string):ConsumerPacket {
  const _query = <MessageQuery> {
    path: PATH.HMI_BP_STATUS,
    topic: TOPIC.REPORT_TO_HMI,
  };
  const _body = <MessageBody> {
    uid: uid,
    status: status,
  };
  const _headers = {};

  return <ConsumerPacket>{
    headers: _headers,
    query: _query,
    body: _body,
  };
}
