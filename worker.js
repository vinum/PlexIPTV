const EventEmitter = require('events')
const once = require('once') // eslint-disable-line no-unused-vars
const DataStream = require('./dataStream')
const request = require('request')
const Logger = new (require('./logger'))()

class Worker extends EventEmitter {
  constructor (guid, line) {
    super()

    // Declares
    this.guid = guid
    this.line = line
    this.url = line.url
    this.listeners = 0
    this.stream = new DataStream()

    // Bindings
    this.end = this.end.bind(this)
    this.unsubscribe = this.unsubscribe.bind(this)
    this.subscribe = this.subscribe.bind(this)
    this.requestFactory = this.requestFactory.bind(this)

    // Init
    this.request = this.requestFactory()
    this.once('end', (guid) => {
      this.stream.end()
    })
    this.stream.on('data', buffer => {
      this.emit('data', buffer)
    })
    this.stream.once('end', () => {
      this.request.abort()
    })
  }

  end () {
    Logger.verbose(`End of: ${this.line.internalUrl}`)
    this.emit('end', this.guid)
  }

  unsubscribe () {
    Logger.verbose(`Unsubscribe to: ${this.line.internalUrl}`)
    this.listeners = this.listeners - 1
    if (this.listeners <= 0) {
      Logger.verbose('No more subscribers.')
      this.listeners = 0
      this.end()
    }
  }

  subscribe () {
    Logger.verbose(`Subscribe to: ${this.line.internalUrl}`)
    this.listeners = this.listeners + 1
  }

  requestFactory () {
    Logger.verbose(`Preloading: ${this.line.internalUrl} (${this.url})`)
    let myRequest = request(this.url)
    myRequest.once('end', (error) => {
      console.log(error)
      if (!this.stream.isEnded) {
        Logger.verbose(`Renew preloading: ${this.internalUrl}`)
        this.request = this.requestFactory(this.url)
      }
    })
    myRequest.on('data', (buffer) => {
      this.stream.write(buffer)
    })
    return myRequest
  }
}

module.exports = Worker
