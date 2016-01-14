var DHT = require('bittorrent-dht')
var magnet = require('magnet-uri')

var uri = 'magnet:?xt=urn:btih:'
var parsed = magnet(uri)

console.log(parsed.infoHash)

var dht = new DHT()

dht.listen(20001, function () {
  console.log('now listening')
})

dht.on('ready', function () {
  // DHT is ready to use (i.e. the routing table contains at least K nodes, discovered
  // via the bootstrap nodes)

  // find peers for the given torrent info hash
  dht.lookup(parsed.infoHash)
})

dht.on('peer', function (addr, infoHash, from) {
  console.log('found potential peer ' + addr + ' through ' + from)
})
