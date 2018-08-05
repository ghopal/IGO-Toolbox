"use strict";
const _ = require('lodash');
const S = require('string');
const Promise = require('bluebird');
const fs = require('fs');

function Instagram(username, password){
  const itu = this ;  
  itu.username = username ;
  itu.password = password ;
	itu.Client = require('instagram-private-api').V1;
	itu.device = new itu.Client.Device('LG512');
	itu.storage = new itu.Client.CookieFileStorage(__dirname + '/data_ig_auth/'+username+'.json');
	itu.session = new itu.Client.Session(itu.device, itu.storage);	
}

Instagram.prototype.Auth = function(input) {
  const itu = this ;  
  return new Promise(function(resolve, reject){ 
        // fs.unlink(__dirname + '/data_ig_auth/'+itu.username+'.json', function(err, info){
            itu.Client.Session.create(itu.device, itu.storage, itu.username, itu.password)
            .then(function(data) {
                // console.log(data)
                resolve('auth berhasil');
            }).catch(function (err) {
                // console.log(err);
                reject(new Error(err));
            });
        // });
  });  
}

Instagram.prototype.Account_getById = function(input) {
  const itu = this ;    
  return new Promise(function(resolve, reject){ 
      itu.Client.Account.getById(itu.session, ''+input.id+'') 
      .then(function(data) {  
          resolve(data._params);
      }).catch(function (err) {
          reject(new Error(err));
      });
  }); 	
}

Instagram.prototype.Feed_UserMediaByUsername = function(input){
  const itu = this ;      
  return new Promise(function(resolve, reject){ 
        itu.Client.Account.searchForUser(itu.session, ''+input.username+'')
        .then(function(pengguna) {
            return [pengguna, itu.Client.Account.getById(itu.session, ''+pengguna._params.id+'')];           
        })
        .spread(function(x, y) {
            if(x._params.isPrivate === true && x._params.friendshipStatus.following === false){
                reject(new Error('Akun '+x._params.username+' terkunci'));
            } else {
                let max_halaman = Math.round(y._params.mediaCount / 18) ;
                let total_postingan = Math.round(y._params.mediaCount);
                    if (input.total_postingan < total_postingan){
                        total_postingan = input.total_postingan ;
                        max_halaman = Math.round(total_postingan / 18) ;
                    } 
                const feed_media = new itu.Client.Feed.UserMedia(itu.session, x._params.id, total_postingan);
                return Promise.mapSeries(_.range(0, max_halaman), function() {
                    return feed_media.get();
                }).then(function(results) {
                    const media = _.flatten(results);
                    const foto = _.map(media, function(medium) {
                        return medium._params ;
                    });
                    resolve(foto); 
                }).catch(function (err) {
                    reject(new Error(err));
                }); 
            }        
        }).catch(function (err) {
             reject(new Error(err));
        });
  });  
};

Instagram.prototype.Feed_UserMediaById = function(input){
  const itu = this ;      
  return new Promise(function(resolve, reject){ 
            if(input.isPrivate === true){
                reject(new Error('Akun '+input.username+' terkunci'));
            } else {
                let max_halaman = Math.round(input.mediaCount / 18) ;
                let total_postingan = Math.round(input.mediaCount);
                    if (input.total_postingan < total_postingan){
                        total_postingan = input.total_postingan ;
                        max_halaman = Math.round(total_postingan / 18) ;
                    } 
                const feed_media = new itu.Client.Feed.UserMedia(itu.session, input.id, total_postingan);
                return Promise.mapSeries(_.range(0, max_halaman), function() {
                    return feed_media.get();
                }).then(function(results) {
                    const media = _.flatten(results);
                    const foto = _.map(media, function(medium) {
                        return medium._params ;
                    });
                    resolve(foto); 
                }).catch(function (err) {
                    reject(new Error(err));
                }); 
            }        
  });  
};

Instagram.prototype.Feed_LocationMedia = function(input){
  const itu = this ;      
  return new Promise(function(resolve, reject){   
      const total_postingan = input.total_postingan ;
      const max_halaman = Math.round(total_postingan / 18) ;
      const feed_media = new itu.Client.Feed.LocationMedia(itu.session, input.locationId, total_postingan);
      return Promise.mapSeries(_.range(0, max_halaman), function() {
        return feed_media.get();
      }).then(function(results) {
          const media = _.flatten(results);
          const foto = _.map(media, function(medium) {
            try {
              delete medium._params.takenAt ;
              delete medium._params.pk ;
              // delete medium._params.deviceTimestamp ;
              delete medium._params.clientCacheKey ;
              delete medium._params.filterType ;
              delete medium._params.imageVersions2 ;
              delete medium._params.originalWidth ;
              delete medium._params.originalHeight ;
              delete medium._params.captionIsEdited ;
              delete medium._params.hasLiked ;
              delete medium._params.commentLikesEnabled ;
              delete medium._params.commentThreadingEnabled ;
              delete medium._params.hasMoreComments ;
              delete medium._params.nextMaxId ;
              delete medium._params.maxNumVisiblePreviewComments ;
              delete medium._params.previewComments ;
              delete medium._params.photoOfYou ;
              delete medium._params.canViewerSave ;
              delete medium._params.organicTrackingToken ;
              delete medium._params.carouselMedia ;
            } catch (e){}            
              return medium._params ;
          });
          resolve(foto);
      }).catch(function (err) {
          reject(new Error(err));
      });  
  });
}

Instagram.prototype.Location_search = function(input){
  const itu = this ;    
  return new Promise(function(resolve, reject){   
      itu.Client.Location.search(itu.session, input.lokasi)
      .then(function(results) {
          const media = _.flatten(results);
          const foto = _.map(media, function(medium) {
              return medium._params ;            
          });        
          resolve(foto);
      }).catch(function (err) {
          reject(new Error(err));
      }); 
  });
}

Instagram.prototype.Comment_create = function(input){
  const itu = this ;    
  return new Promise(function(resolve, reject){ 
      itu.Client.Comment.create(itu.session, input.mediaId, input.text)
      .then(function(data) {
          let fix = {};
              fix.media_id = input.mediaId ;             
              fix.comment = data._params ;    
              fix.warganet = input.warganet ; 
          resolve(fix);
      }).catch(function (err) {
          reject(new Error(err));
      });
  });  
};

Instagram.prototype.Account_searchForUser = function(input){
  const itu = this ;    
  return new Promise(function(resolve, reject){ 
      itu.Client.Account.searchForUser(itu.session, ''+input.username+'') 
      .then(function(data) {  
          resolve(data._params);
      }).catch(function (err) {
          reject(new Error(err));
      });
  });  
};

Instagram.prototype.Feed_AccountFollowers = function(input){
  const itu = this ;    
  return new Promise(function(resolve, reject){ 
        const feed = new itu.Client.Feed.AccountFollowers(itu.session, input.id, input.limit);
        Promise.mapSeries(_.range(0, 20), function() {
            return feed.get();
        })
        .then(function(x) {
            const y = _.flatten(x);
            const data = _.map(y, function(medium) {
              try {
                delete medium._params.pk ;
                delete medium._params.profilePicId ;
                delete medium._params.hasAnonymousProfilePicture ;
                delete medium._params.reelAutoArchive ;
                delete medium._params.isFavorite ;
                delete medium._params.picture ;
              } catch (e){}                      
                return medium._params ;
            });
            const unik = _.uniqBy(data, 'id');
            resolve(unik);
        }).catch(function (err) {
            reject(new Error(err));
        });
  });  
};

Instagram.prototype.Feed_AccountFollowing = function(input){
  const itu = this ;    
  return new Promise(function(resolve, reject){ 
        const feed = new itu.Client.Feed.AccountFollowing(itu.session, input.id, input.limit);
        Promise.mapSeries(_.range(0, 20), function() {
            return feed.get();
        })
        .then(function(x) {
            const y = _.flatten(x);
            const data = _.map(y, function(medium) {
              try {
                delete medium._params.pk ;
                delete medium._params.profilePicId ;
                delete medium._params.hasAnonymousProfilePicture ;
                delete medium._params.reelAutoArchive ;
                delete medium._params.isFavorite ;
                delete medium._params.picture ;
              } catch (e){}                 
                return medium._params ;
            });
            const unik = _.uniqBy(data, 'id');
            resolve(unik);
        }).catch(function (err) {
            reject(new Error(err));
        });
  });  
};

module.exports = Instagram ;

