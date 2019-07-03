
import { MQTTSubject } from '../src/library2'
import {Subject} from 'rxjs'
let connectObserver = new Subject()
    connectObserver.subscribe({
      next: console.log
    })
new MQTTSubject({ url: `mqtt://localhost:${1883}`, connectObserver }).subscribe({
  next: console.log,
  error: (err) => console.error('error'),
  complete: console.log
})
