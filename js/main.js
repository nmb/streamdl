var streamSaver = require('streamsaver');
var readablestream = require('web-streams-polyfill');
var streamBrowserify = require('stream-browserify');
var streamMD5 = require('stream-md5/md5');
var JSZip = require('jszip');
var JSZipUtils = require('jszip-utils');
var fs = require('fs');

// configure streamSaver to use mitm injection on same host
streamSaver.mitm = './mitm.html?version=' + streamSaver.version.full;

var dlButton = document.getElementById('download-button');
var urlinput = document.getElementById('input-box');
console.log("Streamsaver support: " + streamSaver.supported);

function mkdl(str, z){
  let writeStream = streamSaver.createWriteStream('output.zip').getWriter();
  var lines = str.split('\n');

  var readerMap = new Map();
  for(var i = 0;i < lines.length;i++){
    // skip empty lines
    if(!lines[i].trim()) continue;
    let url = lines[i];
    // remove protocol, keep host in path
    var filename = url.replace(/.*\/\//g, "");
    try {
      new URL(url);
      console.log("Downloading " + url);
    }
    catch(err){
      console.log("Skipping: " + url);
      continue;
    }
    var reader
    var state = streamMD5.init();
    fetch(url)
      .then(function(res) {
        if (res.ok) {
          return res;
        } else {
          return Promise.reject(new Error(res.statusText));
        }
      })
      .then( function(res) {
        readerMap.set(url,  new Promise((resolve, reject) => {resolve(res.body.getReader())}));
      })
      .catch(function(e) { 
        console.log("error caught for " + url);
        console.log(e);
      });

    let rs = streamBrowserify.Readable()
    rs._read = () => {

      let p = readerMap.get(url);
      if(!p){ rs.push(null);}
      else {
        p.then(reader => reader.read()
          .then(({ value, done }) =>
            { if(done) {
              rs.push(null);
              console.log(streamMD5.finalize(state));
            }
              else {
                rs.push(new Buffer(value));
                streamMD5.update(state, value);
                console.log("pushing");
              }
            }))
            .catch(error => console.log("error in read: " + error));
      }
    }
    z.file(filename, rs);

  };

  z.generateInternalStream({type: 'uint8array', streamFiles: true})
    .on('data', data => writeStream.write(data))
    .on('error', err => console.error(err))
    .on('end', () => writeStream.close())
    .resume()
}

dlButton.addEventListener('click', function(){
  var zip = new JSZip();
  mkdl(urlinput.value, zip);
}, false);

