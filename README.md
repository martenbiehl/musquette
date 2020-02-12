# MusQueTTe

[![Coverage Status](https://coveralls.io/repos/github/martenbiehl/musquette/badge.svg?branch=master)](https://coveralls.io/github/ixds/musquette?branch=master)
[![Build Status](https://travis-ci.org/martenbiehl/musquette.svg?branch=master)](https://travis-ci.org/ixds/musquette)

Use MQTT with RXJS in node or in the browser with MQTT over WebSocket. [Docs](https://martenbiehl.github.io/musquette/)

The API is similar to the rxjs internal WebSocket implementation for consistency but replaces the multiplex operator with topics.]

## Installation

```bash
yarn add musquette
# or
npm install musquette
```

Import via

```javascript
import { MQTTSubject } from 'musquette'
// or
import { MQTTSubject } from 'musquette/dist/lib/musquette'
```


## Usage

### Establish a connection and listen on a topic:

It is assumed that the payload is JSON parseable string.

```javascript
import { MQTTSubject } from 'musquette'

let mqtt = new MQTTSubject(`ws://localhost:9001`)
let topic = mqtt.topic(`test/topic`)

topic.subscribe({
  next: message => console.log(message.test) // "test",
  error: console.error
})

// or if you are not interested in errors
topic.subscribe(message => console.log(message.test)) // "test

// publish when call on a topic only expects a payload
//
topic.publish({
  test: 'test'
})

```

### Send a payload without subscribing to a topic

```javascript
import { MQTTSubject } from 'musquette'

let mqtt = new MQTTSubject(`ws://localhost:9001`)

// next expects an MQTTMessage object that consists at least
// of a topic and a message property
mqtt.next({
  topic: 'test/topic',
  message: {
    test: 'test'
  }
})

// publish on a connection expects two arguments: a topic and payload
mqtt.publish('test/topic', {
    test: 'test'
  }
})

```

This is equivalent to the first method but does not subscribe to the topic

### Options

```javascript

import { Subject, Observable, merge } from 'rxjs'
import { mapTo } from 'rxjs/operators'
import { MQTTSubject } from 'musquette/dist/lib/musquette.js'

let connected$ = new Subject()
let disconnecting$ = new Subject()
let disconnected$ = new Subject()

merge(connected$, disconnecting$.pipe(mapTo('disconnecting')), disconnected$.pipe(mapTo('disconnected'))).subscribe(console.log)

let mqtt = new MQTTSubject({
  url: `ws://localhost:9001`,
  
  // mqtt.js options
  //
  options: {
    keepalive: 3000,
    clientId:
      'mqttjs_' +
      Math.random()
        .toString(16)
        .substr(2, 8)
  },

  // function that packs the payload that is sent
  // (T) => Buffer
  //
  serializer: value => Buffer.from(JSON.stringify(value)),
  
  // function that unpacks the payload
  // (Buffer) => T
  //
  deserializer: message => JSON.parse(message.toString()),
  
  // Observer that is called when connection is established
  //
  connectObserver: connected$,

  // Observer that is called when disconnect is imminent
  //
  disconnectingObserver: disconnecting$,

  // Observer that is notified when connection has ended
  //
  disconnectObserver: disconnected$
})

mqtt.subscribe(console.log)

setTimeout(() => {

  // disconnect
  //
  mqtt.complete()

}, 5000)

```

### NPM scripts

 - `npm t`: Run test suite
 - `npm start`: Run `npm run build` in watch mode
 - `npm run test:watch`: Run test suite in [interactive watch mode](http://facebook.github.io/jest/docs/cli.html#watch)
 - `npm run test:prod`: Run linting and generate coverage
 - `npm run build`: Generate bundles and typings, create docs
 - `npm run lint`: Lints code
 - `npm run commit`: Commit using conventional commit style ([husky](https://github.com/typicode/husky) will tell you to use it if you haven't :wink:)

## Credits

This library uses the copy pasted [mqtt-wildcard](https://github.com/hobbyquaker/mqtt-wildcard) library from [Sebastian Raff](https://github.com/hobbyquaker).

Based on [typescript library starter](https://www.google.com/search?client=safari&rls=en&q=typescript+library+starter&ie=UTF-8&oe=UTF-8) from [@alexjoverm](https://twitter.com/alexjoverm).

### Contributors ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind are welcome!
