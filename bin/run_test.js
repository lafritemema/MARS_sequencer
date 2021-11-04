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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = __importStar(require("amqplib"));
const config_1 = __importDefault(require("config"));
let rabbitMqUrl;
let exchange;
let sequenceReq;
try {
    rabbitMqUrl = config_1.default.get('rabbitMq.url');
    exchange = config_1.default.get('rabbitMq.exchange');
    sequenceReq = config_1.default.get('sequenceRequest');
}
catch (error) {
    console.log('Error on configuration file.');
    console.log(error.message);
    process.exit(1);
}
const cmdTopic = 'action.cmd';
const allBuildPTopic = 'buildp.all';
const stream = amqp.connect(rabbitMqUrl);
stream
    .then((connection) => {
    /* setTimeout(function() {
      connection.close();
      process.exit(0);
    }, 500);*/
    return connection.createChannel();
})
    .then((channel) => {
    channel.assertExchange(exchange, 'topic', {
        durable: false,
    });
    channel.assertQueue('', {
        exclusive: true,
    })
        .then((queue) => {
        channel.bindQueue(queue.queue, exchange, allBuildPTopic);
        channel.consume(queue.queue, (msg) => {
            if (msg) {
                console.log('sequence to run :');
                console.log(msg.content.toString());
                process.exit(0);
            }
        }, { noAck: true });
    }).catch((error) => {
        console.log(error);
    });
    const strmsg = JSON.stringify(sequenceReq);
    channel.publish(exchange, cmdTopic, Buffer.from(strmsg));
})
    .catch((error) => {
    console.log(error);
});
