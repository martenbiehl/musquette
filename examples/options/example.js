import { Subject, Observable, merge } from 'rxjs'
import { mapTo } from 'rxjs/operators'
import { MQTTSubject } from 'rxjs-mqtt/dist/lib/rxjs-mqtt.js'

let connected$ = new Subject()
let disconnecting$ = new Subject()
let disconnected$ = new Subject()

merge(connected$, disconnecting$.pipe(mapTo('disconnecting')), disconnected$.pipe(mapTo('disconnected'))).subscribe(console.log)

let mqtt = new MQTTSubject({
  url: `ws://localhost:9001`,
  options: {
    keepalive: 3000,
    clientId:
      'mqttjs_' +
      Math.random()
        .toString(16)
        .substr(2, 8)
  },
  serializer: value => Buffer.from(JSON.stringify(value)),
  deserializer: message => JSON.parse(message.toString()),
  connectObserver: connected$,
  disconnectingObserver: disconnecting$,
  disconnectObserver: disconnected$
})

mqtt.subscribe(console.log)

setTimeout(() => {
  mqtt.complete()
}, 5000)
