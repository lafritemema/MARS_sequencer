import * as amqp from 'amqplib';
import {EventEmitter} from 'stream';
import {BuildProcessPacket, RequestStage, Stage} from './buildp_interfaces';
import axios, {Method} from 'axios';
import config from 'config';

let proxyHost:string;
let proxyPort:number;
let bpHost:string;
let bpPort:number;
let rabbitMqUrl:string;
let exchange:string;

const cmdTopic = 'action.cmd';
const proxyAlertTopic = 'proxy.alert';
const allBuildPTopic = 'buildp.all';

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
            channel.bindQueue(queue.queue, exchange, cmdTopic);
            channel.bindQueue(queue.queue, exchange, proxyAlertTopic);

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
        case cmdTopic:
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
        default:
          console.log(msg);
      }
    }
  }
}

interface ProxyPacket {
  status:'ERROR'|'SUCCESS',
  data?:object,
  error?:object
}

interface StageReqPacket {
  action:'REQUEST'|'WAIT',
  description:string,
  request?:RequestSettings
}

interface RequestSettings {
  url:string,
  method:string
  body?:object
}


/**
 *
 * @param sequence
 */
async function runSequence(sequence:Stage[]) {
  const stageGen = stageGenerator(sequence);
  return new Promise(async (resolve, reject)=> {
    while (true) {
      try {
        const stageIt = stageGen.next();
        if (!stageIt.done) {
          console.log('Run sequence : '+ (<Stage>stageIt.value).description);
          // eslint-disable-next-line max-len
          const status = await runSubSequence((<Stage>stageIt.value).requestSequence);
          console.log(status);
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
async function runSubSequence(subSequence:RequestStage[]) {
  const stageReqGen = stageRequestGenerator(subSequence);
  return new Promise(async (resolve, reject)=>{
    while (true) {
      try {
        const srIt = stageReqGen.next();
        if (!srIt.done) {
          // eslint-disable-next-line max-len
          console.log('run subsequence : ' + JSON.stringify(<StageReqPacket>srIt.value));
          const status = await runStageRequest(<StageReqPacket>srIt.value);
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
async function runStageRequest(stageRequest:StageReqPacket):Promise<string> {
  return new Promise(async (resolve, reject)=>{
    switch (stageRequest.action) {
      case 'REQUEST':
        try {
          const req = <RequestSettings>stageRequest.request;
          const proxyResponse = await axios.request<ProxyPacket>({
            method: <Method>req.method,
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
      case 'WAIT':
        console.log('wait');
        eventManager.once(proxyAlertTopic, (alertMsg:ProxyPacket)=>{
          // eslint-disable-next-line max-len
          console.log(alertMsg);
          if (alertMsg.status == 'SUCCESS') {
            resolve(alertMsg.status);
          } else {
            reject(alertMsg.error);
          }
        });
        break;
      default:
        console.log('default');
    }
  });
}

/**
 * @param sequence
 * @return
 */
function* stageGenerator(sequence:Stage[]) {
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
function* stageRequestGenerator(reqStage:RequestStage[]) {
  let index = 0;
  while (index<reqStage.length) {
    // get the next stage
    const reqObj = reqStage[index];
    // get the stage definition
    const reqDef = reqObj.definition;

    // if query parameters, generate the url string
    const querystr = reqDef.query ?
        concatQueryParameter(<QueryObject>reqDef.query):
        '';
    const url = `http://${proxyHost}:${proxyPort}${reqDef.api}${querystr}`;

    // init the stage request packet
    const srpacket:StageReqPacket = {
      action: reqObj.action,
      description: reqObj.description,
    };

    // if action is request
    if (reqObj.action == 'REQUEST') {
      // define a reqInit object with method and headers
      const reqSet:RequestSettings = {
        url: url,
        method: reqDef.method,
      };

      // add a body on reqInit if exist
      if (reqDef.body) reqSet.body = reqDef.body;

      // add the request definition in the stage request packet
      srpacket.request = reqSet;
    }

    // yield the stage request packet
    yield srpacket;
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
