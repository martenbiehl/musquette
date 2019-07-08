import mqttWildcard from '../src/mqtt-wildcard'
// const mw = require('../src/mqtt-wildcard')
const mw = mqttWildcard

// const expect = require('should');

// expect.Assertion.add('arrayEqual', function (other) {
//     this.params = { operator: 'to be have same items' };

//     this.obj.forEach(function (item, index) {
//         //both arrays should at least contain the same items
//         other[index].should.equal(item);
//     });
//     // both arrays need to have the same number of items
//     this.obj.length.should.be.equal(other.length);
// });

describe('trivial matching', function() {
  it('should return the correct array when topic equals wildcard', function() {
    expect(mw('test/123', 'test/123')).toEqual([])
  })
})

describe('mismatching', function() {
  it('should return null', function() {
    expect(mw('test/test/test', 'test/test')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test/test/test/test', 'test/test')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test/test', 'test/test/test')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test/test', 'test/test/test/test')).toEqual(null)
  })
})

describe('wildcard # matching', function() {
  it('should return the correct array when wildcard is #', function() {
    expect(mw('test', '#')).toEqual(['test'])
  })
  it('should return the correct array when wildcard is #', function() {
    expect(mw('test/test', '#')).toEqual(['test/test'])
  })
  it('should return the correct array when wildcard is #', function() {
    expect(mw('test/test/test', '#')).toEqual(['test/test/test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test', 'test/#')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', 'test/#')).toEqual(['test/test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', 'test/test/#')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('/', '/#')).toEqual([''])
  })
  it('should return the correct array', function() {
    expect(mw('/test', '/#')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('/test/', '/#')).toEqual(['test/'])
  })
  it('should return the correct array', function() {
    expect(mw('/test/test', '/#')).toEqual(['test/test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/', 'test/#')).toEqual([''])
  })
  it('should return correct array', function() {
    expect(mw('test', 'test/#')).toEqual([])
  })
  it('should return correct array', function() {
    expect(mw('test/test', 'test/test/#')).toEqual([])
  })
})

describe('wildcard # mismatching', function() {
  it('should return null', function() {
    expect(mw('test', '/#')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test/test', 'muh/#')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('', 'muh/#')).toEqual(null)
  })
})

describe('wildcard + matching', function() {
  it('should return the correct array', function() {
    expect(mw('test', '+')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/', 'test/+')).toEqual([''])
  })
  it('should return the correct array', function() {
    expect(mw('test/test', 'test/+')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', 'test/+/+')).toEqual(['test', 'test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', 'test/+/test')).toEqual(['test'])
  })
})

describe('wildcard + mismatching', function() {
  it('should return null', function() {
    expect(mw('test', '/+')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test', 'test/+')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test/test', 'test/test/+')).toEqual(null)
  })
})

describe('wildcard +/# matching', function() {
  it('should return the correct array', function() {
    expect(mw('test/test', '+/#')).toEqual(['test', 'test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/', '+/test/#')).toEqual(['test', ''])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/', 'test/+/#')).toEqual(['test', ''])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', '+/test/#')).toEqual(['test', 'test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', 'test/+/#')).toEqual(['test', 'test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', '+/+/#')).toEqual(['test', 'test', 'test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test/test', 'test/+/+/#')).toEqual(['test', 'test', 'test'])
  })
  it('should return the correct array', function() {
    expect(mw('test', '+/#')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test', 'test/+/#')).toEqual(['test'])
  })
  it('should return the correct array', function() {
    expect(mw('test/test/test', 'test/+/test/#')).toEqual(['test'])
  })
})

describe('wildcard +/# mismatching', function() {
  it('should return null', function() {
    expect(mw('test/foo/test', '+/test/#')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('foo/test/test', 'test/+/#')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('foo/test/test/test', 'test/+/+/#')).toEqual(null)
  })
})

describe('examples', function() {
  it('should return the correct array', function() {
    expect(mw('test/foo/bar', 'test/+/bar')).toEqual(['foo'])
  })
  it('should return the correct array', function() {
    expect(mw('test/foo/bar', 'test/#')).toEqual(['foo/bar'])
  })
  it('should return the correct array', function() {
    expect(mw('test/foo/bar/baz', 'test/+/#')).toEqual(['foo', 'bar/baz'])
  })
  it('should return the correct array', function() {
    expect(mw('test/foo/bar/baz', 'test/+/+/baz')).toEqual(['foo', 'bar'])
  })
  it('should return the correct array', function() {
    expect(mw('test', 'test/#')).toEqual([])
  })
  it('should return the correct array', function() {
    expect(mw('test/', 'test/#')).toEqual([''])
  })
  it('should return the correct array', function() {
    expect(mw('test/foo/bar/baz', 'test/+/+/baz/#')).toEqual(['foo', 'bar'])
  })
  it('should return null', function() {
    expect(mw('test/foo/bar', 'test/+')).toEqual(null)
  })
  it('should return null', function() {
    expect(mw('test/foo/bar', 'test/nope/bar')).toEqual(null)
  })
})
