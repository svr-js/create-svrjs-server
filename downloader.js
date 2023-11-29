#!/usr/bin/env node

var version = process.argv[2];
var https = require("https");
var os = require("os");
var fs = require("fs");
var zip = require("zip");

var isSVRJSinstalled = fs.existsSync("svr.js");

if(!version) {
  console.log("A utility to create and update SVR.JS");
  console.log("Usage:");
  console.log("create-svrjs-server <version>");
  console.log("  version - SVR.JS version you want to download");
  console.log("            'latest' -> latest SVR.JS version");
  console.log("            'lts' -> latest LTS SVR.JS version");
  console.log("            '3.6.4' -> SVR.JS 3.6.4");
} else if(version == "latest" || version == "lts") {
  https.get({
    hostname: "svrjs.org",
    port: 443,
    path: "/",
    method: "GET",
    headers: {
      "User-Agent": "create-svrjs-server"
    }
  }, function(res) {
    if(res.statusCode != 200) {
      console.log("Server returns " + res.statusCode + " HTTP code");
      return;
    }
    var data = "";
    res.on("data", function(chunk) {
        data += chunk;
    });
    res.on("end", function() {
        var regex = />Download SVR\.JS ([^ <]+)<\/a>/;
        if(version == "lts") {
           regex = />Download SVR\.JS ([^ <]+) LTS<\/a>/;
        }
        var dlver = data.match(regex);
        if(!dlver) {
          console.log("Can't obtain the latest version from main page");
        } else {
          console.log("Selected SVR.JS " + dlver[1]);
          downloadSVRJS(dlver[1]);
        }
    });
  }).on("error", function() {
    console.log("Can't connect to thr SVR.JS download server!");
  });
} else {
  downloadSVRJS(version);
}

function downloadSVRJS(oversion) {
   var version = oversion.toLowerCase().replace(/[^0-9a-z.]/g,".");
   var path = "/svr.js." + version + ".zip";
   if(version.indexOf("beta") != -1) path = "/beta/svr.js." + version + ".zip";
   if(version.indexOf("nightly") != -1) path = "/nightly/svr.js." + version + ".zip";
   https.get({
    hostname: "downloads.svrjs.org",
    port: 443,
    path: path,
    method: "GET",
    headers: {
      "User-Agent": "create-svrjs-server"
    }
  }, function(res) {
    if(res.statusCode != 200) {
      console.log("Server returns " + res.statusCode + " HTTP code while trying to download SVR.JS " + oversion);
      console.log("Make sure you're using the latest version of the create-svrjs-server utility.");
      return;
    }
    var zipFile = fs.createWriteStream("svrjs.zip");
    res.on("end", function() {
      console.log("Downloaded .zip file");
      fs.readFile("svrjs.zip", function(err,data) {
        if(err) {
          console.log("Can't read downloaded file!");
          return;
        } else {
          var reader = zip.Reader(data);
          var allFiles = reader.toObject();
          var allFileNames = Object.keys(allFiles);
          for(var i=0;i<allFileNames.length;i++) {
            var paths = allFileNames[i].split("/");
            if(!isSVRJSinstalled || allFileNames[i].match(/^(?:[^\/.]+\.compressed|(?:log(?:viewer|highlight)|svr(?:passwd|_new)?)\.js|node_modules(?:\/|$))/)) {
              for(var j=0;j<paths.length-1;j++) {
                var dirname = JSON.parse(JSON.stringify(paths)).splice(0,j+1).join("/");
                if(!fs.existsSync(dirname)) {
                  fs.mkdirSync(dirname);
                }
              }
              fs.writeFileSync(allFileNames[i], allFiles[allFileNames[i]]);
            }
          }
          fs.unlinkSync("svrjs.zip");
          console.log("SVR.JS " + (isSVRJSinstalled ? "updated" : "installed") + "! To start SVR.JS, type \"" + (process.argv0 ? process.argv0 : "node") + " svr.js\" For more information refer to SVR.JS documentation at https://svrjs.org/docs");
        }
      });
    });
    res.pipe(zipFile);
     }).on("error", function() {
    console.log("Can't connect to the SVR.JS download server!");
  });
}

