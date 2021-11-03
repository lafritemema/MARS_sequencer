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

let proxyHost:string;
let proxyPort:number;
let bpHost:string;
let bpPort:number;
let rabbitMqUrl:string;
let exchange:string;

const actionCmdTopic = 'action.cmd';
const actionToUserTopic = 'action.touser';
const actionToSeqTopic = 'action.toseq';
const proxyAlertTopic = 'proxy.alert';
const allBuildPTopic = 'buildp.all';
const reportBuildPTopic = 'buildp.report';


try {
  proxyHost = config.get<string>('enipProxy.hostname');
  proxyPort = config.get<number>('enipProxy.port');
  bpHost = config.get<string>('buildProcessor.hostname');
  bpPort = config.get<number>('buildProcessor.port');
  rabbitMqUrl = config.get<string>('rabbitMq.url');
  exchange = config.get('rabbitMq.exchange');
} catch (error) {
  console.log('Error on configuration file.');
  console.log((<Error> error).message);
  process.exit(1);
}


// amqp stream connection
const stream = amqp.connect(rabbitMqUrl);

const eventManager = new EventEmitter();
// const available = true;


// stream definition
stream
    .then((connection: amqp.Connection)=> {
      // channel creation
      return connection.createChannel();
    })
    .then((channel: amqp.Channel)=> {
      // when channel create
      // define assertion on exchange node in topic mode (not durable message)
      channel.assertExchange(exchange, 'topic', {
        durable: false,
      });

      // define assertion on non define queue
      channel.assertQueue('', {
        exclusive: true,
      })
          .then((queue:amqp.Replies.AssertQueue) => {
            console.log('wait cmd message');
            // bind messages on for action.cmd topic
            // action.cmd topic is for transmit data include parameters for
            // buildProcessor request
            channel.bindQueue(queue.queue, exchange, actionCmdTopic);
            channel.bindQueue(queue.queue, exchange, proxyAlertTopic);
            channel.bindQueue(queue.queue, exchange, actionToSeqTopic);

            // handler for message reception on action.cmd topic
            channel.consume(queue.queue,
                processActionCmdMessage,
                {noAck: true});
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
      console.log(error);
    });


/**
 * processing for message receive on action.cmd topic
 * => send a request to build processor
 * @param {ConsumeMessage} msg message received on topic
 */
async function processActionCmdMessage(msg:amqp.ConsumeMessage|null) {
  if (msg) {
    if (msg.fields.routingKey) {
      switch (msg.fields.routingKey) {
        case actionCmdTopic:
          const body = msg.content.toString();
          try {
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
                const status = await runSequence(<Stage[]>bpData.sequence);
                console.log('FIN : '+status);
              } catch (error) {
                console.log('FIN: '+ error);
              }
            } else {
              console.log(bpResponse);
            }
          } catch (bpResponse) {
            // @ts-ignore
            const bpData = bpResponse.data;
            if (bpData.error) {
              console.log(bpData.error);
            } else {
              console.log(bpData);
            }
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
  const stageActionGen = stageActionGenerator<ActionRequest>(actionSequence);
  return new Promise(async (resolve, reject)=>{
    while (true) {
      try {
        const actionIteration = stageActionGen.next();
        if (!actionIteration.done) {
          // eslint-disable-next-line max-len
          const action = actionIteration.value;
          const status = await runStageAction(action, stageId);
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
async function runStageAction(actionRequest:ActionRequest,
    stageId:string):Promise<string> {
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
        const hmiReqDef = <HMIMessage>actionRequest.definition;
        hmiReqDef.id = stageId;
        eventManager.emit(actionToUserTopic, hmiReqDef);
        break;
      case 'WAIT.HMI':
        eventManager.once(actionToSeqTopic, (hmiMsg:HMIMessage)=>{
          resolve(hmiMsg.description);
        });
      default:
        console.log('default');
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
function* stageActionGenerator<ActionRequest>(reqStage:Action[]) {
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
          message: hmiDef.message,
          description: reqObj.description,
        };
        break;
      default:
        definition = undefined;
    }

    // @ts-ignore
    const actionRequest:ActionRequest = {
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
