
const { Subject, AnonymousSubject } = require('rxjs/internal/Subject')
const { Observer, Observable, ReplaySubject } = require('rxjs')

class TestSubject extends AnonymousSubject {
  constructor() {
    super(new Subject(), new Subject());
    console.log(this.source, this.destination, this.observers)
    this.source.subscribe(val => console.log('source', val))
    this.destination.subscribe(val => {
      console.log('destination', val, this.observers)
    })
    this.source.next(4)
    this._output = new ReplaySubject()
    this._output.next(5)
  }
  _subscribe(subscriber) {
    this._output.subscribe(subscriber);
  }
}

let test = new TestSubject()

test.subscribe({ next: value => console.log('subscribe1', value) })
test.subscribe(value => console.log('subscribe2', value))
test.subscribe(value => console.log('subscribe3', value))

test.next(1)
test.next(2)
test.next(3)
