var WebTorrent = require('webtorrent')
var fs = require('fs')

var client = new WebTorrent()

var sintel = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.internetwarchunksrs.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel-1024-surround.mp4'
var ubuntu = 'magnet:?xt=urn:btih:d2474e86c95b19b8bcfdb92bc12c9d44667cfa36'

var magnetUri = ubuntu

console.log('Downloading : ' + magnetUri);

client.download(magnetUri, function (torrent) {
  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  elapsed(torrent)

  torrent.files.forEach(function (file) {
    // Stream each file to the disk
    var source = file.createReadStream()
    var destination = fs.createWriteStream(file.name)
    source.pipe(destination)
  })
})





function elapsed(t){
  setTimeout(function(){

    // Print some info
    console.log('  =====');
    console.log('  Progress : ' + t.progress*100)
    console.log('  Downloaded: ' + t.downloaded);
    console.log('  Speed: ' + t.downloadSpeed());

    // Delayed loop if tx not finished.
    if (t.progress == 1) {
      console.log('  Download over !');
      process.exit(code=0) // not seeding is bad !
    }
    else
      elapsed(t)

  }, 4000)
}
