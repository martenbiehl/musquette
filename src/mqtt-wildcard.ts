// adapted from https://github.com/hobbyquaker/mqtt-wildcard
export default function mqttWildcard(topic: string, wildcard: string) {
  if (topic === wildcard) {
    return []
  } else if (wildcard === '#') {
    return [topic]
  }

  let res = []

  let t = String(topic).split('/')
  let w = String(wildcard).split('/')

  let i = 0
  for (let lt = t.length; i < lt; i++) {
    if (w[i] === '+') {
      res.push(t[i])
    } else if (w[i] === '#') {
      res.push(t.slice(i).join('/'))
      return res
    } else if (w[i] !== t[i]) {
      return null
    }
  }

  if (w[i] === '#') {
    i += 1
  }

  return i === w.length ? res : null
}
