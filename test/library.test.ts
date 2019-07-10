import { MQTTSubject } from '../src/library'
import { Subject } from 'rxjs'

const mosca = require('mosca')

let port = 1884
const noop = () => {}

// TODO: await broker ready
function startBroker(
  serverReady = noop,
  clientConnected = client => {},
  published = (packet, client) => {},
  failed = () => {}
) {
  port = port + 1
  var server = new mosca.Server({ port })

  server.on('clientConnected', clientConnected)

  server.on('published', published)

  server.on('ready', serverReady)

  setTimeout(() => {
    server.close()
    failed()
  }, 6000)

  return [port, server]
}

describe('Connect', async () => {
  let port, broker

  beforeEach(done => {
    ;[port, broker] = startBroker(done)
  })

  afterEach(done => {
    broker.close()
    done()
  })

  it('emits error if server cannot be found', done => {
    let subscription = new MQTTSubject(`mqtt://localhost:${1234}`).subscribe({
      error: (error: Error) => {
        expect(error.message).toContain('ECONNREFUSED')
        done()
      }
    })
  })

  it('supplied connectObserver is notified on connection', done => {
    expect.assertions(1)
    let connectObserver = new Subject()
    connectObserver.subscribe({
      next: event => {
        expect(event).toHaveProperty('cmd', 'connack')
        done()
      }
    })
    new MQTTSubject({ url: `mqtt://localhost:${port}`, connectObserver }).subscribe()
  })

  it('supplied disconnectingObserver is notified when observable is completed', done => {
    expect.assertions(1)
    let disconnectingObserver = new Subject<void>()
    disconnectingObserver.subscribe({
      next: event => {
        expect(event).toBeFalsy()
        done()
      }
    })
    let connection = new MQTTSubject({ url: `mqtt://localhost:${port}`, disconnectingObserver })
    connection.subscribe()
    connection.complete()
  })

  it('supplied disconnectObserver is notified on disconnect', done => {
    expect.assertions(1)
    let disconnectObserver = new Subject()
    disconnectObserver.subscribe({
      next: event => {
        expect(event).toBeFalsy()
        done()
      }
    })
    let connection = new MQTTSubject({ url: `mqtt://localhost:${port}`, disconnectObserver })
    connection.subscribe()
    connection.complete()
  })
})

describe('publishing', () => {
  it('publish message as MQTTMessage', done => {
    const [port, broker] = startBroker(noop, noop, packet => {
      if (packet.topic !== 'topic') return
      let message = JSON.parse(packet.payload.toString())
      expect(message).toEqual('message')
      done()
    })
    expect.assertions(1)

    let connection = new MQTTSubject({ url: `mqtt://localhost:${port}` })
    connection.subscribe()
    connection.next({ topic: 'topic', message: 'message' })
  })

  it('publish message as MQTTMessage without subscribing first', done => {
    const [port, broker] = startBroker(noop, noop, packet => {
      if (packet.topic !== 'topic') return
      let message = JSON.parse(packet.payload.toString())
      expect(message).toEqual('message')
      done()
    })
    expect.assertions(1)

    let connection = new MQTTSubject({ url: `mqtt://localhost:${port}` })
    connection.next({ topic: 'topic', message: 'message' })
  })

  it('publish message with arguments syntax', done => {
    const [port, broker] = startBroker(
      noop,
      noop,
      packet => {
        if (packet.topic !== 'topic') return
        let message = JSON.parse(packet.payload.toString())
        expect(message).toEqual('message')
        done()
      },
      done
    )
    expect.assertions(1)

    let connection = new MQTTSubject({ url: `mqtt://localhost:${port}` })
    connection.subscribe()
    connection.publish('topic', 'message')
  })
})

describe('topic', () => {
  it('listen to data published on the topic', done => {
    expect.assertions(2)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe()
        let topic = connection.topic('topic')
        topic.subscribe(({ topic, message }) => {
          expect(topic).toBe('topic')
          expect(message).toBe('message')
          broker.close()
          done()
        })

        connection.next({
          topic: 'topic',
          message: 'message'
        })

        // broker.publish({
        //   topic: 'topic',
        //   payload: JSON.stringify('message'),
        //   qos: 0,
        //   retain: false
        // })
      },
      noop,
      noop
    )
  })

  it('publish data on the topic', done => {
    expect.assertions(1)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe()
        let topic = connection.topic('topic')

        topic.next({
          topic: 'topic',
          message: 'message'
        })
      },
      noop,
      ({ topic, payload }) => {
        if (topic === 'topic') {
          const message = JSON.parse(payload.toString())
          expect(message).toBe('message')
          broker.close()
          done()
        }
      }
    )
  })

  it('publish data on the topic with arguments', done => {
    expect.assertions(1)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe()
        let topic = connection.topic('topic')

        topic.publish('message')
      },
      noop,
      ({ topic, payload }) => {
        if (topic === 'topic') {
          const message = JSON.parse(payload.toString())
          expect(message).toBe('message')
          broker.close()
          done()
        }
      }
    )
  })

  it('publish data on topic without subscribing first', done => {
    expect.assertions(1)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        let topic = connection.topic('topic')

        topic.next({
          topic: 'topic',
          message: 'message'
        })
      },
      noop,
      ({ topic, payload }) => {
        if (topic === 'topic') {
          const message = JSON.parse(payload.toString())
          expect(message).toBe('message')
          broker.close()
          done()
        }
      }
    )
  })
})

describe('wildcards', () => {
  it('listen to data published on a # wildcard topic', done => {
    expect.assertions(2)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe()
        let topic = connection.topic('topic/#')
        topic.subscribe(({ topic, message }) => {
          expect(topic).toBe('topic/topic')
          expect(message).toBe('message')
          broker.close
          done()
        })

        connection.next({
          topic: 'topic/topic',
          message: 'message'
        })

        // broker.publish({
        //   topic: 'topic',
        //   payload: JSON.stringify('message'),
        //   qos: 0,
        //   retain: false
        // })
      },
      noop,
      noop
    )
  })

  it('listen to data published on a + wildcard topic', done => {
    expect.assertions(2)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe()
        let topic = connection.topic('topic/+/topic')
        topic.subscribe(({ topic, message }) => {
          expect(topic).toBe('topic/topic/topic')
          expect(message).toBe('message')
          broker.close
          done()
        })

        connection.next({
          topic: 'topic/topic/topic',
          message: 'message'
        })

        // broker.publish({
        //   topic: 'topic',
        //   payload: JSON.stringify('message'),
        //   qos: 0,
        //   retain: false
        // })
      },
      noop,
      noop
    )
  })

  it('publishing on wildcard topic throws an error with publish method', done => {
    expect.assertions(1)
    const [port, broker] = startBroker(
      () => {
        try {
          let connection = new MQTTSubject(`mqtt://localhost:${port}`)
          connection.subscribe()
          let topic = connection.topic('topic/#')

          topic.publish('message')
        } catch (err) {
          // TODO: Standardize error types
          expect(err.message).toContain('INVALIDTOPIC')
          done()
        }
      },
      noop,
      noop,
      done
    )
  })

  it('publishing on wildcard topic throws an error with next', done => {
    expect.assertions(1)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe({
          error: err => {
            expect(err.message).toContain('ERR_INVALID_ARG_TYPE')
            done()
          }
        })
        let topic = connection.topic('topic/#')

        topic.next('message')
      },
      noop,
      noop,
      done
    )
  })

  it('publishing data as MQTTMessage type on a wildcard topic works, aka specifying a topic to publish on', done => {
    expect.assertions(1)
    const [port, broker] = startBroker(
      () => {
        let connection = new MQTTSubject(`mqtt://localhost:${port}`)
        connection.subscribe()
        let topic = connection.topic('topic/#')

        topic.next({
          topic: 'topic',
          message: 'message'
        })
      },
      noop,
      ({ topic, payload }) => {
        if (topic === 'topic') {
          const message = JSON.parse(payload.toString())
          expect(message).toBe('message')
          broker.close()
          done()
        }
      }
    )
  })
})
