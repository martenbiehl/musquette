import { connect as mqttConnect, MqttClient } from 'mqtt'
import { Subject } from 'rxjs'

export interface MQTTStatusMessage {
  type: string
}

export interface MQTTSubscriptionMessage {
  topic: string,
  message: any
}

export type MQTTMessage = MQTTStatusMessage | MQTTSubscriptionMessage

export class MQTTSubject extends Subject<MQTTMessage> {
  private _connection: MqttClient
  private _destination = new Subject<MQTTMessage>()
  constructor(url: string) {
    super();

    this._connection = mqttConnect(url)

    this._connection.on('connect', () =>
      this.next({
        type: 'connect'
      })
    )
    this._connection.on('error', err => this.error(err))

    let client: any = this._connection
    client.stream.on('error', (error: Error) => this.error(error))

    this._destination.subscribe({next: ()})
  }

  publish(topic: string, message: string) {
    this._connection.publish(topic, message)
  }
}
export const connect = (url: string): MQTTSubject => {
  return new MQTTSubject(url)
}
