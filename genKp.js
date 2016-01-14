var ed = require('ed25519-supercop')
var jf = require('jsonfile')
var crypto = require('crypto')
var prompt = require('prompt');

console.log('\n  Chunks network key Generator');

prompt.start();
prompt.message=' '
prompt.delimiter=' '

prompt.get([{
    name: 'filename',
    description: '\n  Enter the name desired for your keypair',
    required: true
  },{
    name: 'password',
    description: '\n  Enter password that will lock your private key',
    required: true
  }], function (err, result) {

    if (err)
      console.log("err");

    genKeys(result.filename, result.password)
});


function genKeys(fn, password){

  // Generate Key & Salt
  var keypair = ed.createKeyPair(ed.createSeed())
  var salt = crypto.randomBytes(50)

  // Derive crypto key
  var cryptoKey = crypto.pbkdf2Sync(password, salt, 15000, 256)

  console.log('\n  Public Key : ' + keypair.publicKey.toString('hex') )
  // console.log('\n  Secret Key : ' + keypair.secretKey.toString('hex') )

  var cipher = crypto.createCipher('aes-256-ctr',cryptoKey)
  var crypted = Buffer.concat([cipher.update(keypair.secretKey),cipher.final()]);

  var params = {
    pub: keypair.publicKey,
    priv: crypted,
    salt: salt,
    token: 1
  }

  jf.writeFileSync(fn+".priv", params)
  jf.writeFileSync(fn+".pub", keypair.publicKey.toString('hex'))

  console.log('\n  Keys generated !\n');
}
