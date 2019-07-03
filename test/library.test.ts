
import { connect, MQTTMessage } from '../src/library'

var Server = require('mqtt/test/server')
function connOnlyServer () {
  let server = new Server(function (client: any) {
    client.on('connect', function (packet: any) {
      client.connack({ returnCode: 0 })
      server.close()
    })
  })
  return server
}
function publishServer (callback) {
  let server = new Server(function (client: any) {
    client.on('connect', function (packet: any) {
      client.connack({ returnCode: 0 })

    })
    client.on('publish', function (packet: any) {
      console.log('message published')
      server.close()
      callback()
    })
  })
  return server
}
let port = 1883

/* CONNECT WITH OBSERVABLE */

describe('Connect', async () => {
  it('emits error if server cannot be found', (done) => {
    expect.assertions(1)
    connect(`mqtt://localhost:${port}`).subscribe({
      error: (error) => {
        expect(error).toBeTruthy()
        done()
      }
    })
  })

  it('on connection emits event', (done) => {
    let broker = connOnlyServer().listen(port)

    expect.assertions(1)
    connect(`mqtt://localhost:${port}`).subscribe((event) => {
      expect(event).toBeTruthy()
      done()
    })
  })

  it('publish message on topic', (done) => {
    let broker = publishServer(done).listen(port)
    let connection = connect(`mqtt://localhost:${port}`)

    connection.publish('topic', "message")
  })

  it('next publishes with topic and message', (done) => {
    let broker = publishServer(done).listen(port)
    let connection = connect(`mqtt://localhost:${port}`)

    connection.next({ topic: 'topic', message: "message" })
  })
})

describe('topic', () => {
  it('return a new subject', () => {

  })

  describe('subscribe', () => {

  })

  describe('publish', () => {

  })
})



