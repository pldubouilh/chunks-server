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
    debugger

   if(res === null){
      console.log('\n  Error : ' + err);
      console.log('\n  Let\'s republish what we had');
      var r = jf.readFileSync('previousDHTQuery')
      res.k = Buffer(r.k)
      res.v = Buffer(r.v)
      res.sig = Buffer(r.sign)
    }
    else if (prev === res.v){
      console.log('\n  Nothing new')
    }
    else{
      console.log('\n  New content : ' + res.v.toString())
      prev = res.v
    }


    console.log('\n  Updating...')

    var opts = {
      k: res.k,
      seq: res.seq,
      v: res.v,
      sign: res.sig
    }

    jf.writeFileSync('previousDHTQuery', opts)

    dht.put(res,function(err, hash){
      if(err){
        console.log('\n  Error while putting stuff >> ' + err)
        return
      }
      console.log('\n  Just put some stuff there : ' + hash.toString('hex'));
    })


  })
}
