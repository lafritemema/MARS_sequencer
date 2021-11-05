import * as amqp from 'amqplib';
import {EventEmitter} from 'stream';
import {Action,
  BuildProcessPacket,
  Stage,
  ActionRequest,
  HMIRequestDefinition,
  ProxyRequestDefinition,
  HMIMessage,
  ProxyResponse} from './buildp_interfaces';
import axios, {AxiosRequestConfig} from 'axios';
import config from 'config';
import Logger from './logger';

const logger = new Logger();

logger.info('Run sequencer service');

// event emitter to handle and emit events between elements
const eventManager = new EventEmitter();
// eslint-disable-next-line no-unused-vars
let isRunningSequence = false;


// define var for configuration
let proxyHost:string;
let proxyPort:number;
let bpHost:string;
let bpPort:number;
let rabbitMqUrl:string;
let exchange:string;
let resolution:Record<string, string>|undefined;

if (config.has('resolutionMessage')) {
  resolution = config.get('resolutionMessage');
}

// get configuration using config library
try {
  // try to get config
  logger.try('Load configuration');

  proxyHost = config.get<string>('enipProxy.hostname');
  proxyPort = config.get<number>('enipProxy.port');
  bpHost = config.get<string>('buildProcessor.hostname');
  bpPort = config.get<number>('buildProcessor.port');
  rabbitMqUrl = config.get<string>('rabbitMq.url');
  exchange = config.get('rabbitMq.exchange');

  logger.success('Load configuration');
} catch (error) {
  // if one element missing raise an error and quit the process
  logger.failure('Load configuration');
  logger.error('Error on configuration file : ' + (<Error> error).message);

  if (resolution && ('configuration' in resolution)) {
    logger.resolution(resolution['configuration']);
  }
  process.exit(1);
}


// define topics for amqp com via rabbitmq
const actionCmdTopic = 'action.cmd';
const actionToUserTopic = 'action.touser';
const actionToSeqTopic = 'action.toseq';
const proxyAlertTopic = 'proxy.alert';
const allBuildPTopic = 'buildp.all';
const reportBuildPTopic = 'buildp.report';

// connection to rabbitMq server
logger.try('Connection to RabbitMQ Server');
const stream = amqp.connect(rabbitMqUrl);


// Initialize amqp communication with rabbitmq server
stream
    .then((connection: amqp.Connection)=> {
      // channel creation
      logger.success('Connection to RabbitMQ Server');
      return connection.createChannel();
    })
    .then((channel: amqp.Channel)=> {
      logger.try('Configure AMQP communications');
      // when channel create
      // define assertion on exchange node in topic mode (not durable message)
      channel.assertExchange(exchange, 'topic', {
        durable: false,
      });

      // define assertion on non define queue
      channel.assertQueue('', {
        exclusive: true,
      }).then((queue:amqp.Replies.AssertQueue) => {
        // bind (subscribe) for specific topics
        // action.cmd topic for ihm command message
        channel.bindQueue(queue.queue, exchange, actionCmdTopic);
        // proxy.alert topic for proxy alert message
        channel.bindQueue(queue.queue, exchange, proxyAlertTopic);
        // action.toseq topic for ihm action message
        channel.bindQueue(queue.queue, exchange, actionToSeqTopic);

        // define a handler for message reception on all the topics
        // define above
        // for each message it run processRabbitMqMessage function
        channel.consume(queue.queue,
            processRabbitMqMessage,
            {noAck: true});

        logger.success('Configure AMQP communications');
        logger.info('Sequencer service ready');
        logger.info('Wait for IHM command message');
      }).catch((error:Error)=>{
        console.log(error);
      });

      // handler for eventmanager buildp.all event
      eventManager.on(allBuildPTopic, (data:object)=>{
        console.log('publish data');
        // create a buffer containing data
        const dataBuffer = Buffer.from(JSON.stringify(data));
        // publish the message on buildp.all topic
        // buildp.all topic is for transmit information about build process
        // to IHM
        channel.publish(exchange, allBuildPTopic, dataBuffer);
      });

      eventManager.on(reportBuildPTopic, (report)=>{
        const dataBuffer = Buffer.from(JSON.stringify(report));
        channel.publish(exchange, reportBuildPTopic, dataBuffer);
      });

      eventManager.on(actionToUserTopic, (data) => {
        const dataBuffer = Buffer.from(JSON.stringify(data));
        channel.publish(exchange, actionToUserTopic, dataBuffer);
      });
    })
    .catch((error)=>{
      logger.failure('Connection to RabbitMQ Server');
      logger.error((<Error>error).message);

      if (resolution && ('rabbitMQ' in resolution)) {
        logger.resolution(resolution['rabbitMQ']);
      }
      process.exit(1);
    });


/**
 * processing for message receive on action.cmd topic
 * => send a request to build processor
 * @param {ConsumeMessage} msg message received on topic
 */
async function processRabbitMqMessage(msg:amqp.ConsumeMessage|null) {
  if (msg) {
    if (msg.fields.routingKey) {
      switch (msg.fields.routingKey) {
        case actionCmdTopic:
          if (! isRunningSequence) {
            logger.info('Commande to run sequence received from IHM');
            const body = msg.content.toString();
            try {
              logger.try('Send request to build processor');
              const bpResponse = await axios.request<BuildProcessPacket>({
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
                  isRunningSequence = true;
                  const status = await runSequence(<Stage[]>bpData.sequence);
                  console.log('FIN : '+ status);
                  isRunningSequence = false;
                } catch (error) {
                  console.log('FIN: '+ error);
                }
              } else {
                console.log(bpResponse);
              }
            } catch (error) {
              // @ts-ignore
              logger.failure('Send request to build processor');
              logger.error('Build processor service unreachable');
              logger.error((<Error>error).message);

              if (resolution && ('buildProcessor' in resolution)) {
                logger.resolution(resolution['buildProcessor']);
              }

              logger.warn('Sequence aborted');
              logger.info('Wait for new IHM command message');
            }
          } else {
            // eslint-disable-next-line max-len
            logger.warn('Request for a new sequence received but sequencer already running.\nRequest ignored');
          }
          break;
        case proxyAlertTopic:
          // TODO wait method
          console.log(proxyAlertTopic);
          // const proxyMsg = <ProxyPacket>JSON.parse(msg.content.toString());
          const proxyMsg = {status: 'SUCCESS'};
          eventManager.emit(proxyAlertTopic, proxyMsg);
          break;
        case actionToSeqTopic:
          const hmiMsg = {status: 'SUCCESS'};
          eventManager.emit(actionToSeqTopic, hmiMsg);
          break;
        default:
          console.log(msg);
      }
    }
  }
}

/**
 *
 * @param sequence
 */
async function runSequence(sequence:Stage[]) {
  const stageGen = stageGenerator<Stage>(sequence);
  return new Promise(async (resolve, reject)=> {
    while (true) {
      try {
        const stageIt = stageGen.next();
        if (!stageIt.done) {
          const stage = stageIt.value;
          console.log('Run sequence : '+ stage.description);
          // eslint-disable-next-line max-len
          const status = await runSubSequence(stage.requestSequence, stage.id);
          console.log(status);
          eventManager.emit(reportBuildPTopic,
              {
                id: stage.id,
                status: 'SUCCESS',
              });
        } else {
          resolve(true);
          break;
        }
      } catch (error) {
        reject(error);
        break;
      }
    }
  });
}

/**
 *
 * @param subSequence
 * @returns
 */
async function runSubSequence(actionSequence:Action[], stageId:string) {
  const stageActionGen = stageActionGenerator<ActionRequest>(actionSequence,
      stageId);
  return new Promise(async (resolve, reject)=>{
    while (true) {
      try {
        const actionIteration = stageActionGen.next();
        if (!actionIteration.done) {
          // eslint-disable-next-line max-len
          const actionRequest = actionIteration.value;
          const status = await runStageAction(actionRequest);
          console.log('subrequest : '+ status);
        } else {
          resolve(true);
          break;
        }
      } catch (error) {
        console.log(error);
        reject(error);
        break;
      }
    }
  });
}

/**
 *
 * @param stageRequest
 */
async function runStageAction(actionRequest:ActionRequest):Promise<string> {
  return new Promise(async (resolve, reject)=>{
    // eslint-disable-next-line max-len
    console.log(`Run action ${actionRequest.description}, type : ${actionRequest.type}`);
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
        const hmiReqDef = <HMIMessage>actionRequest.definition;
        eventManager.emit(actionToUserTopic, hmiReqDef);
        resolve('SUCCESS');
        break;
      case 'WAIT.HMI':
        eventManager.once(actionToSeqTopic, (hmiMsg:HMIMessage)=>{
          resolve(hmiMsg.description);
        });
        break;
      default:
        console.log('default');
        reject('error');
    }
  });
}

/**
 * @param sequence
 * @return
 */
function* stageGenerator<Stage>(sequence:Stage[]) {
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
function* stageActionGenerator<ActionRequest>(reqStage:Action[],
    stageId:string) {
  let index = 0;
  while (index<reqStage.length) {
    // get the next stage

    const reqObj = reqStage[index];
    let definition:AxiosRequestConfig|HMIMessage|undefined;
    const atype = `${reqObj.action}.${reqObj.target}`;

    switch (atype) {
      case 'REQUEST.PROXY':
        const pdef = <ProxyRequestDefinition> reqObj.definition;
        const querystr = pdef.query ?
          concatQueryParameter(<QueryObject>pdef.query):
          '';

        const url = `http://${proxyHost}:${proxyPort}${pdef.api}${querystr}`;

        definition = <AxiosRequestConfig>{
          method: pdef.method,
          data: pdef.body,
          headers: {
            'Content-type': 'application/json',
          },
          url: url,
        };
        break;
      case 'REQUEST.HMI':
        const hmiDef = <HMIRequestDefinition>reqObj.definition;
        definition = <HMIMessage>{
          id: stageId,
          message: hmiDef.message,
          description: reqObj.description,
        };
        break;
      default:
        definition = undefined;
    }

    // @ts-ignore
    const actionRequest:ActionRequest = {
      stageId: stageId,
      type: atype,
      definition: definition,
    };

    // yield the stage request packet
    yield actionRequest;
    index++;
  }
}

interface QueryObject {
  reg?:number,
  type?:string,
  startReg?:number,
  blockSize?:number,
}

/**
 * transform query parameter object to string
 * @param {object} queryObj query parameter object
 * @return {string} string under query parameter format
 */
function concatQueryParameter(queryObj:QueryObject):string {
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
