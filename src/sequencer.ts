import {getConfigFromYaml} from '@common/utils';
import Logger from '@common/logger';
import {AMQPServer} from './server/amqp';
import {
  ServerConfiguration,
  ConsumerPacket,
  MessageQuery,
  MessageHeaders,
  MessageBody} from './server/interfaces';
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
  HMI_REPORT = 'report.hmi',
  // eslint-disable-next-line no-unused-vars
  HMI_REQUEST = 'request.hmi',
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
  HMI_SEQUENCE_ALL = '/sequencer/all',
  // eslint-disable-next-line no-unused-vars
  HMI_SEQUENCE_STATUS = '/sequencer/status',
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
            .addConsumer(TOPIC.PROXY_REPORT, processProxyReport);

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
  // no update of body
  // update the query with hmi report topic
  cPacket.query = {
    type: 'amqp',
    topic: TOPIC.HMI_REPORT,
  };

  // update the path with the HMIT sequencer/all path
  cPacket.headers = {
    path: PATH.HMI_SEQUENCE_ALL,
  };

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

  actions.forEach(async (action:Action)=>{
    const result = await runAction(action);
    console.log(result);
  });
}

/**
 * function to run actions
 * @param {Action} action : the action to run
 * @return {Promise<string>}
 */
async function runAction(action:Action):Promise<string> {
  LOGGER.info(`run action ${action.uid} : ${action.description}`);

  LOGGER.try('request commands to command generator');
  const commands = await getCommandsForAction(action);
  LOGGER.success('request commands to command generator service');

  commands.forEach(async (command:Command)=>{
    LOGGER.debug(`run command ${command.description}`);
    // const result = await runCommand(command);
  });

  // TODO
  return 'success';
}

/**
 * function to run a command
 * @param {Command} command : command to run
 * @return {Promise<string>}
 */
function runCommand(command:Command):Promise<string> {
  return new Promise((resolve, reject) => {
    switch (command.action) {
      case 'REQUEST':
        // send a request using the current protocol
        // all needed data are stored in the command
        sendRequest(comProtocol, command);
      case 'WAIT':
        const waitDef = <WaitDefinition> command.definition;
        POSTMAN.once(waitDef.uid, (response)=>{
          console.log(response);
          resolve(response);
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

    // publish using amqpServer
    amqpServer.publish(cPacket);

    // wait a postman event to return a result
    // POSTMAN emit send in the processCmdGenReport
    // use the unique action uid as event name
    POSTMAN.once(action.uid, (commands:Command[])=>{
      resolve(commands);
    });

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
  const cPacket = buildCPacketFromReqCommand(comProtocol, command);
  amqpServer.publish(cPacket);
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
  const commandDef = command.definition;
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
      // reportTopic = TOPIC.HMI_REPORT;
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
  return cPacket;
}

/**
 * consuming function to process report from hmi
 * @param cPacket
 * @returns

function processHmiReport(cPacket:ConsumerPacket):ConsumerPacket {
  // TODO to define
  return cPacket;
}
*/
