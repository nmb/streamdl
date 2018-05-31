//var streamSaver = require('stream');
//var streams = require("web-streams-polyfill");

//import { ReadableStream } from "web-streams-polyfill";
var streamSaver = require('streamsaver');
var readablestream = require('web-streams-polyfill');
var streamBrowserify = require('stream-browserify');
var streamMD5 = require('stream-md5/md5');
//import { JSZip } from 'jszip/dist/jszip.js';
var JSZip = require('jszip');
var JSZipUtils = require('jszip-utils');
var fs = require('fs');
//import * as JSZipUtils from 'jszip-utils';
//import fetchStream from 'fetch-readablestream';
//import { createWriteStream, supported, version } from 'streamsaver'

// configure streamSaver to use mitm injection on same host
streamSaver.mitm = '/mitm.html?version=' + streamSaver.version.full;

function urlToPromise(url) {
    return new Promise(function(resolve, reject) {
        JSZipUtils.getBinaryContent(url, function (err, data) {
            if(err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function handleErrors(response) {
  if (!response.ok ) {
    throw Error(response.statusText);
  }
  return response;
}

function fetchStatusHandler(response) {
    if (response.status === 200) {
          return response;
            } else {
                  throw new Error(response.statusText);
                    }
}
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
    let filename = url.replace(/.*\/\//g, "");
    try {
      new URL(url);
      console.log("Downloading " + url);
    }
    catch(err){
      console.log("Skipping: " + url);
      continue;
    }
    let rs = streamBrowserify.Readable()
      let reader
      let state = streamMD5.init();
    readerMap.set(url, fetch(url).then(res => res.body.getReader()));
    rs._read = () => {
      //let p = reader || (reader = fetch(url).then(res => res.body.getReader()).catch(error => console.log(error)));
      //let p = readerMap.get(url) || (readerMap.set(url, fetch(url).then(res => res.body.getReader())));
      let p = readerMap.get(url);
      p.then(reader => reader.read().then(({ value, done }) =>
            { if(done) {
                         rs.push(null);
                         console.log(streamMD5.finalize(state));
                       }
            else {
              rs.push(new Buffer(value));
              streamMD5.update(state, value);
            }
            }
            )); //.catch(error => console.log(error) ))

    }

    //z.file(filename, urlToPromise("https://cors-anywhere.herokuapp.com/" + url), {binary:true});
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

  /*
zip.generateNodeStream({streamFiles:true})
.pipe(fs.createWriteStream('out.zip'))
.on('finish', function () {
    // JSZip generates a readable stream with a "end" event,
    // but is piped here in a writable stream which emits a "finish" event.
    console.log("out.zip written.");
});
  */
  mkdl(urlinput.value, zip);

/*  zip.generateAsync({type:"uint8array", streamFiles: true}, function updateCallback(metadata) {
        var msg = "progression : " + metadata.percent.toFixed(2) + " %";
        if(metadata.currentFile) {
            msg += ", current file = " + metadata.currentFile;
        }
        console.log(msg);
        //updatePercent(metadata.percent|0);
    })
    .then(function callback(blob) {

        // see FileSaver.js
        //saveAs(blob, "example.zip");

        console.log("done !");
    }, function (e) {
        console.log(e);
        console.log(e.description);
    });
*/
}, false);

