var DHT = require('bittorrent-dht')
var createTorrent = require('create-torrent')
var pt = require('parse-torrent')
var WebTorrent = require('webtorrent')

var crypto = require('crypto')
var sha1 = require('simple-sha1')
var ed = require('ed25519-supercop')

var jf = require('jsonfile')
var prompt = require('prompt');

/*
  - Assume user wants to share what's in blog

  1/ Create torrent with what's inside seeding stuff
  2/ Ask for password to decrypt priv key
  3/ Push new content on DHT every 5mn
  4/ Seed.
*/

var DELAYPUSH = 5 //mn

// Key file name
var keySet, dht, opts
var increment = true

if(process.argv[2]){
  keySet = process.argv[2]
  console.log('\n  Reading keys from ' + keySet);
}
else{
  console.log('\n  Need to provide a priv key\n');
  process.exit(1);
}


// Read keys & token val
var params = jf.readFileSync(keySet)
var pub = Buffer(params.pub)
var priv = Buffer(params.priv)

console.log('\n  Public Key : ' + pub.toString('hex'));

var location = sha1.sync(pub)
var value                     // Value will be set later

console.log('\n  Location of content on DHT : ' + location);

// Create torrent with stuff inside ./blog
createTorrent("blog", function (err, torrent) {

  // Ugh, ugly. But it allows me to debug code way faster...
  var trackers = "&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.publicbt.com%3A80&tr=udp%3A%2F%2Ftracker.istole.it%3A6969&tr=udp%3A%2F%2Ftracker.ccc.de%3A80&tr=udp%3A%2F%2Fopen.demonii.com"

  if (!err) {
    var parsed = pt(torrent)
    var magnet = pt.toMagnetURI({
      infoHash: parsed.infoHash
    })
    console.log("\n  Magnet link : " + magnet)
    value = magnet + trackers

    // passing over to DHT
    initDht()
  }
})


// Init DHT
function initDht(){
  // DHT Object
  dht = new DHT({ bootstrap: true, verify: ed.verify })
  dht.on('ready', function () {
    console.log("\n  DHT reached")
    if (process.argv[3])
      unlockKey(process.argv[3])
    else
      askUser();
  })
}


// Prompts for decryption password
function askUser(){
  prompt.start();
  prompt.message=' '
  prompt.delimiter=' '

  prompt.get([{
      name: 'password',
      description: '\n  Enter password to unlock private key',
      required: true // Could add hidden: true
    }], function (err, result) {

      if (err)
        console.log("err");

      unlockKey(result.password)
  });
}


// Unlock key
function unlockKey(password){

  var salt = Buffer(params.salt,'hex')
  var encKey = Buffer(params.priv,'hex')

  // Derive crypto key
  var cryptoKey = crypto.pbkdf2Sync(password, salt, 15000, 256)
  var decipher = crypto.createDecipher('aes-256-ctr',cryptoKey)
  priv = Buffer.concat([decipher.update(encKey) , decipher.final()]);

  console.log('\n  Secret key unlocked');
  //console.log('\n' + priv.toString('hex'))

  //passing over to pushStuff
  pushStuff()
}

function pushStuff(){

  // Refresh data on dht every DELAYPUSH mn
  setTimeout(pushStuff, DELAYPUSH*60*1000);

  // Don't increment if coming from timeout
  if (increment){

    console.log('\n  Updating tokens')
    params.token++

    jf.writeFileSync(keySet, params)

    // Set opts
    opts = {
      k: pub,
      seq: params.token,
      v: value,
      sign: function (buf) {
        var sig = ed.sign(buf, pub, priv)
        return sig
      }
    }
  }

  // Put stuff @ sha1(pubKey)!
  dht.put(opts, function (errors, hash) {
    console.log("\n  DHT updated")
    if(increment)
      seed(dht)
  })
}

function seed(ht){

  // Flag no increment up
  increment = false

  // TODO be less dumb and reuse torrent generated earlier
  var client = new WebTorrent({dht : ht})
  client.seed('blog', function onTorrent (torrent) {
      console.log('\n  Seeding - info hash:', torrent.infoHash)
  })
}
