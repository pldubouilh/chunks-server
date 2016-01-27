var DHT = require('bittorrent-dht')
var createTorrent = require('create-torrent')
var pt = require('parse-torrent')
var WebTorrent = require('webtorrent')

var crypto = require('crypto')
var sha1 = require('simple-sha1')
var ed = require('ed25519-supercop')

var jf = require('jsonfile')
var prompt = require('prompt');

// Key file name
var keySet, dht, opts

if(process.argv[2]){
  keySet = process.argv[2]
  console.log('\n  Reading keys from ' + keySet);
}
else{
  console.log('\n Chunks Server !'.yellow)
  console.log('\n Usage : node postLatest.js myKey.priv [Decryption password - optionnal]')
  console.log('\n Error : Need to provide a private key\n'.red);
  process.exit(1);
}

var keyName = process.argv[2].split('.')[0] + '.local'

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
  dht = new DHT({ bootstrap: false, verify: ed.verify })
  dht.on('ready', function () {

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

  // Put stuff @ sha1(pubKey)!
  dht.put(opts, function (err, hash) {
    dht.get(hash, function(err,res){
      var options = {
        k: res.k,
        seq: res.seq,
        v: res.v,
        sign: res.sig
      }
      dht.put(options, function (err, hash) {
        console.log('\n  Updated stuff stored !')
        jf.writeFileSync(keyName, options)
        process.exit(0)
      })
    })
  })
}
