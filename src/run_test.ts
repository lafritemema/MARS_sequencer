import * as amqp from 'amqplib';
import config from 'config';

let rabbitMqUrl:string;
let exchange:string;
let sequenceReq:object;

try {
  rabbitMqUrl = config.get<string>('rabbitMq.url');
  exchange = config.get<string>('rabbitMq.exchange');
  sequenceReq = config.get<object>('sequenceRequest');
} catch (error) {
  console.log('Error on configuration file.');
  console.log((<Error> error).message);
  process.exit(1);
}

const cmdTopic = 'action.cmd';
const allBuildPTopic = 'buildp.all';

const stream = amqp.connect(rabbitMqUrl);

stream
    .then((connection: amqp.Connection)=> {
      /* setTimeout(function() {
        connection.close();
        process.exit(0);
      }, 500);*/
      return connection.createChannel();
    })
    .then((channel: amqp.Channel)=> {
      channel.assertExchange(exchange, 'topic', {
        durable: false,
      });

      channel.assertQueue('', {
        exclusive: true,
      })
          .then((queue:amqp.Replies.AssertQueue) => {
            channel.bindQueue(queue.queue, exchange, allBuildPTopic);

            channel.consume(queue.queue, (msg)=>{
              if (msg) {
                console.log('sequence to run :');
                console.log(msg.content.toString());
                process.exit(0);
              }
            }, {noAck: true});
          }).catch((error:Error)=>{
            console.log(error);
          });

      const strmsg = JSON.stringify(sequenceReq);
      channel.publish(exchange, cmdTopic, Buffer.from(strmsg));
    })
    .catch((error)=>{
      console.log(error);
    });
