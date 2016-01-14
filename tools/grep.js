var DHT = require('bittorrent-dht')
var sha1 = require('simple-sha1')
var ed = require('ed25519-supercop')
var WebTorrent = require('webtorrent')
var fs = require('fs')
var jf = require('jsonfile')

// Init client
var client = new WebTorrent()

// Read keys
var keySet

if(process.argv[2]){
  var keySet = process.argv[2]
  console.log('\n  Reading keys from ' + keySet);
}
else
  quit('\n  Can\'t read keyfile \n')


var params = jf.readFileSync(keySet)
var pub = Buffer(params)
console.log('\n  Public Key : ' + pub.toString('hex'));

// Location of the data
var location = sha1.sync(pub)


// Init DHT
var dht = new DHT({ bootstrap: true, verify: ed.verify })
dht.on('ready', function () {

  console.log("\n  Network reached.");
  console.log("\n  Now getting " + location.toString('hex'));

  // Network reached. Now get interesting stuff
  dht.get(location, function (err, res) {
    if (err) quit('\n  Didnt get any reply from the DHT. Are you firewalled ?')

    console.log( '\n  Received from DHT : ' + res.v.toString('Utf8') );
    console.log( '\n  Passing over to download...');

    client.add(res.v.toString('Utf8'),{ path : "received" }, function (torrent) {
      console.log('\n  Client downloading ' + torrent.infoHash)
      console.log('  ... there : ' + torrent.path + '\n\n');
      elapsed(torrent)
    })
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
    if (t.progress == 1)
      console.log('\n\n  Download over - now seed !');
    else
      elapsed(t)

  }, 4000)
}

function quit (why) {
  console.log(why + '\n  Quitting...');
  process.exit(1);
}
