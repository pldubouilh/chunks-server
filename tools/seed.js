var WebTorrent = require('webtorrent')


// Init client
var client = new WebTorrent()

client.seed('seedingStuff/fancyWebsite.html', function onTorrent (torrent) {
    // Client is seeding the file!
    console.log('Torrent info hash:', torrent.infoHash)
})
