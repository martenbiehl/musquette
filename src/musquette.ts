import { Subject, AnonymousSubject } from 'rxjs/internal/Subject'
import {
  Subscriber,
  Observable,
  Subscription,
  Operator,
  ReplaySubject,
  Observer,
  NextObserver
} from 'rxjs'
import { filter } from 'rxjs/operators'

import {
  MqttClient as MQTTClient,
  IClientOptions as MQTTClientOptions,
  connect as connectBroker
} from 'mqtt'
import mqttWildcard from './mqtt-wildcard'

interface MQTTMessage<T> {
  topic: string
  message: T
  qos?: 0 | 1 | 2
  retain?: boolean
}

export interface MQTTSubjectConfig<T> {
  /** The url of the MQTT server to connect to */
  url: string
  /** Options to be sent to the mqtt library */
  options?: MQTTClientOptions
  /**
   * A serializer used to create messages from passed values before the
   * messages are sent to the server. Defaults to JSON.stringify.
   */
  serializer: (value: T) => Buffer
  /**
   * A deserializer used for messages arriving on the socket from the
   * server. Defaults to JSON.parse.
   */
  deserializer: (message: Buffer) => T
  /**
   * An Observer that watches when open events occur on the underlying connection
   */
  connectObserver?: NextObserver<Event>
  /**
   * An Observer than watches when close events occur on the underlying connection
   */
  disconnectObserver?: NextObserver<CloseEvent | Error>
  /**
   * An Observer that watches when a close is about to occur
   */
  disconnectingObserver?: NextObserver<void>

  [key: string]: any
}

const DEFAULT_MQTT_CONFIG: MQTTSubjectConfig<any> = {
  url: '',
  deserializer: (message: Buffer) => JSON.parse(message.toString()),
  serializer: (value: any) => Buffer.from(JSON.stringify(value))
}

export class MQTTSubject<T> extends AnonymousSubject<MQTTMessage<T>> {
  private _config: MQTTSubjectConfig<T>

  /** @deprecated This is an internal implementation detail, do not use. */
  private _output: Subject<MQTTMessage<T>> = new Subject<MQTTMessage<T>>()

  private _connection?: MQTTClient

  constructor(urlOrConfig: string | MQTTSubjectConfig<T>, destination?: Observer<MQTTMessage<T>>) {
    super()
    const config = (this._config = { ...DEFAULT_MQTT_CONFIG })
    if (typeof urlOrConfig === 'string') {
      config.url = urlOrConfig
    } else {
      for (let key in urlOrConfig) {
        if (urlOrConfig.hasOwnProperty(key)) {
          config[key] = urlOrConfig[key]
        }
      }
    }

    this.destination = destination || new ReplaySubject<MQTTMessage<T>>()

    this._connectBroker()
  }

  lift<R>(operator: Operator<MQTTMessage<T>, R>): Observable<R> {
    const connection = new MQTTSubject<R>(
      this._config as MQTTSubjectConfig<any>,
      this.destination as any
    )
    // @ts-ignore
    connection.operator = operator
    connection.source = this
    // @ts-ignore
    return connection
  }

  private _resetState() {
    if (this._connection) {
      this._connection.end()
    }
    if (!this.source) {
      this.destination = new ReplaySubject()
    }
    this._output = new Subject<MQTTMessage<T>>()
  }

  topic(topic: string): MQTTTopicSubject<T> {
    if (topic[0] === '/') {
      console.warn(
        `Topic ${topic} starts with a slash which creates an empty root topic. This is handled differently between different broker implementations. (This is not OSC!)`
      )
    }
    if (this._connection) {
      this._connection.subscribe(topic)
    }
    return new MQTTTopicSubject(this, topic)
  }

  private _connectBroker() {
    const { url, options } = this._config
    const observer = this._output

    let connection = (this._connection = options ? connectBroker(url, options) : connectBroker(url))

    connection.on('connect', (e: Event) => {
      const { connectObserver } = this._config
      if (connectObserver) {
        connectObserver.next(e)
      }
      const queue = this.destination

      this.destination = Subscriber.create<MQTTMessage<T>>(
        command => {
          if (typeof command !== 'object') {
            observer.error(
              new Error(
                'ERR_INVALID_ARG_TYPE: Expected MQTTMessage with at least properties topic and message'
              )
            )
            return
          }

          const { topic, message, qos = 0, retain } = command

          if (connection && connection.connected) {
            const { serializer } = this._config
            if (connection) {
              connection.publish(topic, serializer(message), { qos, retain }, (error?: Error) => {
                if (error && this.destination) this.destination.error(e)
              })
            }
          }
        },
        e => {
          const { disconnectingObserver } = this._config
          if (disconnectingObserver) {
            disconnectingObserver.next(undefined)
          }
          this._resetState()
        },
        () => {
          const { disconnectingObserver } = this._config
          if (disconnectingObserver) {
            disconnectingObserver.next(undefined)
          }
          connection.end()
          this._resetState()
        }
      ) as Subscriber<any>

      if (queue && queue instanceof ReplaySubject) {
        ;(queue as ReplaySubject<MQTTMessage<T>>).subscribe(this.destination)
      }
    })

    connection.on('error', e => {
      this._resetState()
      observer.error(e)
    })
    ;(connection as any).stream.on('error', (e: Error) => {
      this._resetState()
      observer.error(e)
    })

    connection.on('end', (e: CloseEvent) => {
      this._resetState()
      const { disconnectObserver } = this._config
      if (disconnectObserver) {
        disconnectObserver.next(e)
      }
      observer.complete()
    })
    connection.on('message', (topic: string, message: Buffer) => {
      // TODO: Serialize/deserialize per topic
      try {
        const { deserializer } = this._config
        observer.next({
          topic,
          message: deserializer(message)
        })
      } catch (err) {
        observer.error(err)
      }
    })
  }

  publish(topic: string, message: T) {
    if (!this.destination) return

    this.destination.next({
      topic,
      message
    })
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  _subscribe(subscriber: Subscriber<MQTTMessage<T>>): Subscription {
    const { source } = this
    if (source) {
      return source.subscribe(subscriber)
    }
    if (this._output) {
      this._output.subscribe(subscriber)
    }
    return subscriber
  }
}

const isWildcardTopic = (topic: string) => topic.includes('#') || topic.includes('+')
export class MQTTTopicSubject<T> extends AnonymousSubject<MQTTMessage<T>> {
  source: MQTTSubject<T>

  constructor(source: MQTTSubject<T>, private _topic: string) {
    super(source, source)
    this.source = source
  }

  publish(message: T) {
    if (isWildcardTopic(this._topic)) {
      throw new Error('INVALIDTOPIC: Cannot publish on wildcard topic')
    }
    let observer: MQTTSubject<T> = this.source
    observer.next({ topic: this._topic, message })
  }

  _subscribe(subscriber: Subscriber<MQTTMessage<T>>) {
    // FIXME: Actual subscribe should be executed here

    const { source } = this
    if (source) {
      return this.source
        .pipe(filter(packet => !!mqttWildcard(packet.topic, this._topic)))
        .subscribe(subscriber)
    } else {
      return Subscription.EMPTY
    }
  }
}

export const connect = <T>(urlOrConfig: string | MQTTSubjectConfig<T>) =>
  new MQTTSubject(urlOrConfig)
