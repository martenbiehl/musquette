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

import { MqttClient as MQTTClient, IClientOptions as MQTTClientOptions, connect } from 'mqtt'
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
  /** The protocol to use to connect */
  options?: MQTTClientOptions
  /**
   * A serializer used to create messages from passed values before the
   * messages are sent to the server. Defaults to JSON.stringify.
   */
  serializer?: (value: T) => Buffer
  /**
   * A deserializer used for messages arriving on the socket from the
   * server. Defaults to JSON.parse.
   */
  deserializer?: (message: Buffer) => T
  /**
   * An Observer that watches when open events occur on the underlying connection
   */
  connectObserver?: NextObserver<Event>
  /**
   * An Observer than watches when close events occur on the underlying connection
   */
  disconnectObserver?: NextObserver<CloseEvent>
  /**
   * An Observer that watches when a close is about to occur due to
   * unsubscription.
   */
  disconnectingObserver?: NextObserver<void>

  [key: string]: any
}

const DEFAULT_MQTT_CONFIG: MQTTSubjectConfig<any> = {
  url: '',
  deserializer: (message: Buffer) => JSON.parse(message.toString()),
  serializer: (value: any) => Buffer.from(JSON.stringify(value))
}

const WEBSOCKETSUBJECT_INVALID_ERROR_OBJECT =
  'WebSocketSubject.error must be called with an object with an error code, and an optional reason: { code: number, reason: string }'

export class MQTTSubject<T> extends AnonymousSubject<T> {
  private _config: MQTTSubjectConfig<T>

  /** @deprecated This is an internal implementation detail, do not use. */
  private _output?: Subject<T> = new Subject<T>()

  private _connection?: MQTTClient

  constructor(urlOrConfig: string | MQTTSubjectConfig<T>, destination?: Observer<T>) {
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

    this.destination = destination || new ReplaySubject()

    this._connectBroker()
  }

  lift<R>(operator: Operator<T, R>): MQTTSubject<R> {
    // TODO: Fix all the <any> here
    const connection = new MQTTSubject<R>(this._config as MQTTSubjectConfig<any>, <any>(
      this.destination
    ))
    connection.operator = operator
    connection.source = this
    return connection
  }

  private _resetState() {
    // FIX: resetting connection
    if (this._connection) {
      this._connection.end()
    }
    // this._connection = null;
    if (!this.source) {
      this.destination = new ReplaySubject()
    }
    this._output = new Subject<T>()
  }

  topic(topic: string): MQTTTopicSubject<T> {
    if (this._connection) {
      this._connection.subscribe(topic)
    }
    return new MQTTTopicSubject(this, topic)
  }

  private _connectBroker() {
    const { url, options } = this._config
    const observer = this._output

    if (!observer) {
      throw new Error('Output observer not initialized')
    }

    let connection: MQTTClient | null = null
    try {
      connection = options
        ? connect(
            url,
            options
          )
        : connect(url)
      this._connection = connection
    } catch (e) {
      observer.error(e)
      return
    }

    // TODO: Review if this.reset is sufficient
    const subscription = new Subscription(() => {
      // this._connection = null;
      if (connection && connection.connected) {
        connection.end()
      }
    })

    connection.on('connect', e => {
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
              connection.publish(topic, serializer(message), { qos, retain }, (error: Error) => {
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
          if (connection) {
            connection.end()
          }
          this._resetState()
        }
      ) as Subscriber<any>

      if (queue && queue instanceof ReplaySubject) {
        subscription.add((<ReplaySubject<T>>queue).subscribe(this.destination))
      }
    })

    connection.on('error', e => {
      this._resetState()
      observer.error(e)
    })

    connection.stream.on('error', e => {
      this._resetState()
      observer.error(e)
    })

    connection.on('end', e => {
      this._resetState()
      const { disconnectObserver } = this._config
      if (disconnectObserver) {
        disconnectObserver.next(e)
      }
      observer.complete()
      // if (e.wasClean) {
      //   observer.complete();
      // } else {
      //   observer.error(e);
      // }
    })
    connection.on('message', (topic, messageBuffer) => {
      // TODO: Serialize/deserialize per topic
      try {
        const { deserializer } = this._config
        let message = messageBuffer.toString()
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
    this.destination.next({
      topic,
      message
    })
  }

  /** @deprecated This is an internal implementation detail, do not use. */
  _subscribe(subscriber: Subscriber<T>): Subscription {
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
export class MQTTTopicSubject<T> extends AnonymousSubject<T> {
  constructor(source: MQTTSubject<T>, private _topic: string) {
    super(source, source)
  }

  publish(message: T) {
    if (isWildcardTopic(this._topic)) {
      throw new Error('INVALIDTOPIC: Cannot publish on wildcard topic')
    }
    let observer: MQTTSubject<T> = this.source
    observer.next({ topic: this._topic, message })
  }

  _subscribe(subscriber: Subscriber<T>) {
    //FIXME: Actual subscribe should be executed here
    const { source } = this
    if (source) {
      return this.source
        .pipe(filter(packet => typeof mqttWildcard(packet.topic, this._topic) !== 'undefined'))
        .subscribe(subscriber)
    } else {
      return Subscription.EMPTY
    }
  }
}
