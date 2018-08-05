"use strict";
// const Raven = require('raven');
//       Raven.config('https://xxxxxxxxxxxxx:yyyyyyyy@sentry.io/zzzzzzzzzz').install();

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const domain = require("domain");
const domain_catch = domain.create();
const spawn = require('child_process').spawn;
const fork = require('child_process').fork;
const stringify = require('json-stringify-safe');
const jsonfile = require('jsonfile');
const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const Promise = require('bluebird');
const async = require('async');
const download = require('download');
const S = require('string');
const readline = require('readline');
const buffer_teks = readline.createInterface({
        input: fs.createReadStream(__dirname + '/galeri/daftar_akun.txt')
});

const INSTAGRAM = require( __dirname + '/api_instagram.js');

if (cluster.isMaster) {
    console.log('Master ' + process.pid + ' has started.');
    cluster.fork();
    cluster.on('exit', function(deadWorker, code, signal) {
      let worker = cluster.fork();
      let newPID = worker.process.pid;
      let oldPID = deadWorker.process.pid;
      console.log('worker '+oldPID+' died.');
      console.log('worker '+newPID+' born.');
    });
} 
if (cluster.isWorker) {  
console.log('Worker ' + process.pid + ' has started.');  
domain_catch.on('error', function(err){
    console.error("domain error : "+err+"");
    console.log("domain message : "+err.message+"");
});

domain_catch.run(function(){

let konfigurasi = jsonfile.readFileSync(__dirname + '/galeri/konfigurasi.json');
if(_.isObject(konfigurasi) === true){
    const IGO = new INSTAGRAM(konfigurasi.username, konfigurasi.password);   
    const queue_download = async.queue(function(input, callback) { 
            fse.ensureDirSync(__dirname + '/galeri/' + input.username);
            fse.ensureDirSync(__dirname + '/galeri/' + input.username + '/' + input.kategori);
            const nama_file = __dirname + '/galeri/' + input.username + '/' + input.kategori + '/' + input.nama_file+input.ekstensi_file ;
            if(fs.existsSync(nama_file)){
              callback(null);
            } else {
                download(input.url)
                .then(function (data) { 
                    fs.writeFile(nama_file, data, function (err) {
                        callback('Tersimpan '+nama_file);
                    });                                        
                })
                .catch(function (err) {
                    callback(null);
                });           
            }       
    }, 5);
    const queue_antrian_akun = async.queue(function(input, callback) { 
        IGO.Feed_UserMediaByUsername({ username: input.username })          
        .then(function(data) {
            _.forEach(data, function(a, b){
                let info = {
                    username: a.user.username,
                    nama_file: a.id,
                    url: null,
                    ekstensi_file: null,
                    kategori: null
                }
                switch(a.mediaType) {
                    case 1: // single posting foto
                        if(a.hasOwnProperty('images')){
                           info.url = a.images[0].url;
                           info.ekstensi_file = '.jpg';
                           info.kategori = 'images';
                        }
                        queue_download.push(info, function (x) {
                            if(x) console.log(x);
                        }); 
                        break;              
                    case 2: // single posting video
                        if(a.hasOwnProperty('videos')){
                           info.url = a.videos[0].url;
                           info.ekstensi_file = '.mp4';
                           info.kategori = 'videos';
                        } else {
                           info.url = a.images[0].url;
                           info.ekstensi_file = '.jpg';
                           info.kategori = 'images';
                        }
                        queue_download.push(info, function (x) {
                            if(x) console.log(x);
                        }); 
                        break;
                    case 8:
                            let counter_child = 0 ;
                            if(_.has(a, "videos") === true){
                                _.forEach(a.videos, function(val_child, index_child){
                                    info.nama_file = a.id + '-album-' + counter_child ;
                                    info.url = val_child[0].url;
                                    info.ekstensi_file = '.jpg';
                                    info.kategori = 'videos';
                                    ++counter_child;    
                                    queue_download.push(info, function (x) {
                                       if(x) console.log(x);
                                    });                                                                                                  
                                });                             
                            };   
                            if(_.has(a, "images") === true){
                                _.forEach(a.images, function(val_child, index_child){
                                    info.nama_file = a.id + '-album-' + counter_child ;
                                    info.url = val_child[0].url;
                                    info.ekstensi_file = '.jpg';
                                    info.kategori = 'images';
                                    ++counter_child;      
                                    queue_download.push(info, function (x) {
                                       if(x) console.log(x);
                                    });                                                                 
                                });                              
                            };                                                                                         
                        break;
                    default:                    
                }  
            });  
            queue_download.drain = function() {
               callback('Proses download telah selesai, mohon tunggu, sedang pindah akun selanjutnya.');
            };            
        })     
        .catch(function (err) {
            callback('Skip.');
        });
    }, 1);
    queue_antrian_akun.drain = function() {
        console.log('Proses mengunduh galeri dalam daftar akun telah selesai. 100% completed. Tekan CTRL+C untuk keluar.');
    }; 
    IGO.Auth()          
    .then(function(data) {
        buffer_teks.on('line', function (x) {
            let ig_igo = S(x).between('https://www.instagram.com/', '/').s ;
            queue_antrian_akun.push({ username: ig_igo }, function (y) {
                if(y) console.log(y);
            });             
        });        
    })     
    .catch(function (err) {
        console.error(err.message);
    });
}

  }); // domain run                 
} //cluster
