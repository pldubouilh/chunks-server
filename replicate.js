var DHT = require('bittorrent-dht')
var createTorrent = require('create-torrent')
var pt = require('parse-torrent')
var WebTorrent = require('webtorrent')

var crypto = require('crypto')
var sha1 = require('simple-sha1')
var ed = require('ed25519-supercop')

var prompt = require('prompt')
var jf = require('jsonfile')

var DELAYPUSH = 2 //mn

// Key file name
var pubkey, dht, opts, prev
var increment = true

// Read stdin
if(process.argv[2]){
  if(process.argv[2].length === 64)
    pubkey = Buffer(process.argv[2], 'hex')
  else
    pubkey = Buffer(jf.readFileSync(process.argv[2]), 'hex')
  console.log('\n  Republishing what\'s at : ' + pubkey.toString('hex'));
}
else{
  console.log('\n Error : Need to provide a publickey\n'.red);
  process.exit(1);
}


var keyName = process.argv[2].split('.')[0] + '.local'
var location = sha1.sync(pubkey)
var value                     // Value will be set later

console.log('\n  Location of content on DHT : ' + location);

// Init DHT
dht = new DHT({ bootstrap: true , verify: ed.verify })
dht.on('ready', function () {
  console.log("\n  DHT reached")
  republish()
})



function republish(){

  // Refresh data on dht every DELAYPUSH mn
  setTimeout(republish, DELAYPUSH*60*1000);

  // Get and republish
  dht.get(location, function (err, res) {

    debugger;
    var r = jf.readFileSync(keyName)
    var updateFromLocal = false
    var store = false

    console.log('\n  Received : ' + res.v.toString())

    if(res === null){
      console.log('\n  DHT Empty - let\'s rewrite');
      updateFromLocal = true
    }
    else if (res.seq < r.seq){
      console.log('\n  DHT Outdated - let\'s update');
      updateFromLocal = true
    }
    else if (res.seq === r.seq){
      console.log('\n  Nothing new')
    }
    else if (res.seq > r.seq){
      console.log('\n  New content ! ')
      store = true
    }

    if(updateFromLocal){
      var opts = {
        k: Buffer(r.k, 'hex'),
        seq: r.seq,
        v: Buffer(r.v, 'hex'),
        sign: Buffer(r.sign, 'hex')
      }
    }
    else{
      var opts = {
        k: res.k,
        seq: res.seq,
        v: res.v,
        sign: res.sig
      }
    }

    // Store token if update found
    if (store) jf.writeFileSync(keyName , opts)

    console.log('\n  Updating slot ' +  opts.k.toString('hex'))
    dht.put(opts,function(err, hash){
      if(err){
        console.log('\n  Error while putting stuff >> ' + err)
        return
      }
      console.log('\n  Just put some stuff there : ' + hash.toString('hex'));
    })
  })
}
