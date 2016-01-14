var createTorrent = require('create-torrent')
var pt = require('parse-torrent')
var fs = require('fs')

createTorrent('seedingStuff', function (err, torrent) {
  if (!err) {
    // `torrent` is a Buffer with the contents of the new .torrent file
    var parsed = pt(torrent)
    var magnet = pt.toMagnetURI({
      infoHash: parsed.infoHash
    })
    console.log("  Magnet link : " + magnet)
  }
})
